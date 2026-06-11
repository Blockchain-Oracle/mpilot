// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";

import { DataTypes } from "@aave/protocol/libraries/types/DataTypes.sol";
import { MockAavePool } from "../../src/mocks/MockAavePool.sol";
import { MockAavePoolLib } from "../../src/mocks/MockAavePoolLib.sol";
import {
    InsufficientCollateralLTV,
    WouldBreakHealthFactor,
    InsufficientSupply,
    InsufficientDebt,
    AssetNotSupported,
    BorrowingDisabled
} from "../../src/mocks/MockAavePool.sol";

/// @notice Minimal price oracle for unit tests — returns fixed USD prices (8-decimal base).
contract FixedPriceOracle {
    mapping(address => uint256) internal _prices;

    function setPrice(
        address asset,
        uint256 priceUsd8
    ) external {
        _prices[asset] = priceUsd8;
    }

    function getAssetPrice(
        address asset
    ) external view returns (uint256) {
        return _prices[asset];
    }
}

/// forge-config: default.fuzz.runs = 256
contract MockAavePoolTest is Test {
    MockAavePool internal pool;
    FixedPriceOracle internal oracle;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");

    // Token addresses (no real ERC-20 needed — pool tracks balances internally)
    address internal sUSDe = makeAddr("sUSDe");
    address internal USDC = makeAddr("USDC");
    address internal USDe = makeAddr("USDe");
    address internal USDY = makeAddr("USDY");
    address internal mETH = makeAddr("mETH");

    // E-Mode 1 params from Mainnet (research/concierge/03-providers/aave-v3-mantle.md)
    uint16 internal constant EMODE1_LTV = 9000;
    uint16 internal constant EMODE1_LT = 9200;
    uint16 internal constant EMODE1_BONUS = 10_400;

    function setUp() public {
        oracle = new FixedPriceOracle();
        pool = new MockAavePool(address(oracle), admin);

        // Prices: sUSDe = $1.232, USDC = $1.00, USDe = $1.00, USDY = $1.00, mETH = $3000
        oracle.setPrice(sUSDe, 123_200_000); // $1.232 * 1e8
        oracle.setPrice(USDC, 100_000_000); // $1.00
        oracle.setPrice(USDe, 100_000_000);
        oracle.setPrice(USDY, 100_000_000);
        oracle.setPrice(mETH, 300_000_000_000); // $3000

        vm.startPrank(admin);
        // sUSDe: LTV=0 in general mode (E-Mode trap), active, NOT borrowing-enabled
        pool.mockInitReserve(sUSDe, 18, makeAddr("aSUSDe"), makeAddr("dSUSDe"), 200, 0, 0, 0, false);
        pool.mockInitReserve(
            USDC, 6, makeAddr("aUSDC"), makeAddr("dUSDC"), 400, 500, 7500, 8000, true
        );
        pool.mockInitReserve(
            USDe, 18, makeAddr("aUSDe"), makeAddr("dUSDe"), 350, 400, 7500, 8000, true
        );
        pool.mockInitReserve(
            USDY, 18, makeAddr("aUSDY"), makeAddr("dUSDY"), 350, 400, 7500, 8000, true
        );
        pool.mockInitReserve(
            mETH, 18, makeAddr("amETH"), makeAddr("dmETH"), 250, 350, 7000, 7500, true
        );
        // E-Mode 1: "sUSDe Stablecoins" (verified from Mantle Mainnet)
        pool.mockSetEmodeCategory(1, EMODE1_LTV, EMODE1_LT, EMODE1_BONUS, "sUSDe Stablecoins");
        vm.stopPrank();
    }

    // ─── Reserves ────────────────────────────────────────────────────────────

    function test_getReservesList_ReturnsFiveAssets() public view {
        address[] memory list = pool.getReservesList();
        assertEq(list.length, 5);
        assertEq(list[0], sUSDe);
        assertEq(list[1], USDC);
        assertEq(list[2], USDe);
        assertEq(list[3], USDY);
        assertEq(list[4], mETH);
    }

    function test_getReservesCount_ReturnsFive() public view {
        assertEq(pool.getReservesCount(), 5);
    }

    // ─── E-Mode ──────────────────────────────────────────────────────────────

    function test_getEModeCategoryData_ReturnsMainnetValues() public view {
        DataTypes.EModeCategoryLegacy memory eMode = pool.getEModeCategoryData(1);
        assertEq(eMode.ltv, EMODE1_LTV, "ltv");
        assertEq(eMode.liquidationThreshold, EMODE1_LT, "lt");
        assertEq(eMode.liquidationBonus, EMODE1_BONUS, "bonus");
        assertEq(eMode.label, "sUSDe Stablecoins", "label");
    }

    // ─── E-Mode 1 silent-fail trap ───────────────────────────────────────────

    /// sUSDe LTV=0 in general mode → borrow must revert (reproduces Mainnet silent-fail).
    function test_borrow_RevertsWhenSusdeWithoutEMode() public {
        vm.prank(alice);
        pool.supply(sUSDe, 1000e18, alice, 0);

        vm.prank(alice);
        vm.expectRevert(InsufficientCollateralLTV.selector);
        pool.borrow(USDC, 100e6, 2, 0, alice);
    }

    /// After setUserEMode(1), sUSDe LTV=90% → borrow succeeds.
    function test_borrow_SucceedsAfterSetUserEMode1() public {
        vm.prank(alice);
        pool.supply(sUSDe, 1000e18, alice, 0); // supply 1000 sUSDe ≈ $1232

        vm.prank(alice);
        pool.setUserEMode(1);

        // Available to borrow: $1232 * 90% = $1108.8 → up to ~1108 USDC
        vm.prank(alice);
        pool.borrow(USDC, 100e6, 2, 0, alice); // borrow 100 USDC — should succeed
        // Verify debt tracked
        (, uint256 debtBase,,,,) = pool.getUserAccountData(alice);
        assertGt(debtBase, 0);
    }

    function test_setUserEMode_UpdatesUserCategory() public {
        vm.prank(alice);
        pool.setUserEMode(1);
        assertEq(pool.getUserEMode(alice), 1);
    }

    // ─── Supply / Withdraw ────────────────────────────────────────────────────

    function test_supply_IncreasesCollateral() public {
        vm.prank(alice);
        pool.supply(USDC, 1000e6, alice, 0);
        (uint256 collateral,,,,,) = pool.getUserAccountData(alice);
        // 1000 USDC @ $1 = $1000 base (8-decimal: 1000e8)
        assertEq(collateral, 1000e8);
    }

    function test_withdraw_ReducesCollateral() public {
        vm.prank(alice);
        pool.supply(USDC, 1000e6, alice, 0);
        vm.prank(alice);
        pool.withdraw(USDC, 500e6, alice);
        (uint256 collateral,,,,,) = pool.getUserAccountData(alice);
        assertEq(collateral, 500e8);
    }

    function test_withdraw_AllWithMaxUint() public {
        vm.prank(alice);
        pool.supply(USDC, 500e6, alice, 0);
        vm.prank(alice);
        uint256 withdrawn = pool.withdraw(USDC, type(uint256).max, alice);
        assertEq(withdrawn, 500e6);
        (uint256 collateral,,,,,) = pool.getUserAccountData(alice);
        assertEq(collateral, 0);
    }

    function test_withdraw_RevertsWhenBreaksHealthFactor() public {
        vm.prank(alice);
        pool.supply(USDC, 1000e6, alice, 0); // $1000 collateral

        vm.prank(alice);
        pool.borrow(USDC, 500e6, 2, 0, alice); // borrow $500, HF ≈ 1.6

        // Try to withdraw all — would drop HF below 1
        vm.prank(alice);
        vm.expectRevert(WouldBreakHealthFactor.selector);
        pool.withdraw(USDC, 1000e6, alice);
    }

    // ─── getUserAccountData / healthFactor ────────────────────────────────────

    /// HF = (200e8 * 0.92) / 100e8 = 1.84e18 (±1e15 precision).
    function test_getUserAccountData_HealthFactorCorrect() public {
        vm.prank(alice);
        pool.supply(USDC, 200e6, alice, 0); // $200 collateral (USDC @ $1)

        vm.prank(alice);
        pool.borrow(USDC, 100e6, 2, 0, alice); // $100 debt

        (,,, uint256 lt,, uint256 hf) = pool.getUserAccountData(alice);
        // LT for USDC = 8000 (80%); HF = 200e8 * 80% / 100e8 = 1.6e18
        assertEq(lt, 8000, "lt");
        assertApproxEqAbs(hf, 1.6e18, 1e15, "hf");
    }

    /// With USDC LT=8000 and totalCollateral=$200, totalDebt=$100: HF = 200*0.80/100 = 1.6.
    function test_getUserAccountData_AvailableBorrowsReflectsLTV() public {
        vm.prank(alice);
        pool.supply(USDC, 1000e6, alice, 0); // $1000 collateral, LTV=75%

        (,, uint256 avail,,,) = pool.getUserAccountData(alice);
        // Available = 1000e8 * 7500 / 10000 = 750e8
        assertEq(avail, 750e8);
    }

    // ─── Repay ────────────────────────────────────────────────────────────────

    function test_repay_ClearsDebt() public {
        vm.prank(alice);
        pool.supply(USDC, 1000e6, alice, 0);
        vm.prank(alice);
        pool.borrow(USDC, 100e6, 2, 0, alice);

        vm.prank(alice);
        pool.repay(USDC, type(uint256).max, 2, alice);

        (, uint256 debt,,,,) = pool.getUserAccountData(alice);
        assertEq(debt, 0);
    }

    // ─── getReserveData ───────────────────────────────────────────────────────

    function test_getReserveData_ReturnsRates() public view {
        // USDC: supplyRateBps=400, borrowRateBps=500
        uint256 expectedSupplyRay = (400 * MockAavePoolLib.RAY) / 10_000;
        uint256 expectedBorrowRay = (500 * MockAavePoolLib.RAY) / 10_000;
        DataTypes.ReserveDataLegacy memory rd = pool.getReserveData(USDC);
        assertEq(rd.currentLiquidityRate, expectedSupplyRay, "supplyRate");
        assertEq(rd.currentVariableBorrowRate, expectedBorrowRay, "borrowRate");
    }

    // ─── mockSetReserveData ───────────────────────────────────────────────────

    function test_mockSetReserveData_UpdatesRates() public {
        vm.prank(admin);
        pool.mockSetReserveData(USDC, 600, 700);
        DataTypes.ReserveDataLegacy memory rd = pool.getReserveData(USDC);
        assertEq(rd.currentLiquidityRate, (600 * MockAavePoolLib.RAY) / 10_000, "new supplyRate");
        assertEq(
            rd.currentVariableBorrowRate, (700 * MockAavePoolLib.RAY) / 10_000, "new borrowRate"
        );
    }

    // ─── getReserveConfigurationData ─────────────────────────────────────────

    function test_getReserveConfigurationData_ReturnsCorrectFlags() public view {
        (
            uint256 decimals_,
            uint256 ltv,
            uint256 liquidationThreshold,,,
            bool usageAsCollateral,
            bool borrowingEnabled,,
            bool isActive,
        ) = pool.getReserveConfigurationData(USDC);
        assertEq(decimals_, 6, "decimals");
        assertEq(ltv, 7500, "ltv");
        assertEq(liquidationThreshold, 8000, "lt");
        assertTrue(usageAsCollateral, "usageAsCollateral");
        assertTrue(borrowingEnabled, "borrowingEnabled");
        assertTrue(isActive, "isActive");
    }

    function test_getReserveConfigurationData_SusdeNotBorrowable() public view {
        (,,,,,, bool borrowingEnabled,,,) = pool.getReserveConfigurationData(sUSDe);
        assertFalse(borrowingEnabled, "sUSDe should not be borrowable");
    }
}
