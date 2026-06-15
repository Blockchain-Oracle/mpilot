// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";

import { ConciergeRegistry } from "../src/ConciergeRegistry.sol";
import { ConciergeRegistryProxy } from "../src/ConciergeRegistryProxy.sol";
import { MockAavePool } from "../src/mocks/MockAavePool.sol";
import { MockAaveOracle } from "../src/mocks/MockAaveOracle.sol";
import { MockMETH } from "../src/mocks/MockMETH.sol";
import { MockSUSDe } from "../src/mocks/MockSUSDe.sol";
import { MockUSDC } from "../src/mocks/MockUSDC.sol";
import { MockUSDe } from "../src/mocks/MockUSDe.sol";
import { MockUSDY } from "../src/mocks/MockUSDY.sol";
import { MockWMNT } from "../src/mocks/MockWMNT.sol";

/// @notice Sepolia-only flat-deploy script.
///
/// DeployAll.s.sol tried to embed all mock bytecode into HelperConfig and call
/// HelperConfig's `getConfig()` inside `vm.startBroadcast()` — the resulting
/// HelperConfig contract is 43 KB, well over the EVM 24 KB code size limit, so
/// it failed to deploy in real broadcast (worked under simulation).
///
/// This script deploys each mock directly as its own broadcast tx. Each mock is
/// under 24 KB. Logged addresses are the REAL deployed addresses, NOT simulation
/// addresses. Run after `examples/golden-path/scripts/keygen.mjs` funds the EOA.
///
/// Usage:
///   forge script script/DeploySepolia.s.sol \
///     --rpc-url https://rpc.sepolia.mantle.xyz \
///     --private-key $GOLDEN_PRIVATE_KEY \
///     --broadcast --skip-simulation
contract DeploySepolia is Script {
    function run() external {
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        require(block.chainid == 5003, "DeploySepolia: must run on Mantle Sepolia (5003)");
        require(deployer.balance >= 0.1 ether, "DeploySepolia: balance < 0.1 MNT");

        vm.startBroadcast();

        // Mock tokens — deployer holds MINTER_ROLE on each.
        MockSUSDe susde = new MockSUSDe(deployer);
        MockUSDC usdc = new MockUSDC(deployer);
        MockUSDe usde = new MockUSDe(deployer);
        MockUSDY usdy = new MockUSDY(deployer);
        MockMETH meth = new MockMETH(deployer);
        MockWMNT wmnt = new MockWMNT(deployer);

        // Mock Aave oracle. Deploy with deployer as admin so the harness can seed
        // prices via setAssetPrice if needed.
        MockAaveOracle oracle = new MockAaveOracle(deployer);

        // Mock Aave pool — deployer is admin, will list mock token reserves separately.
        MockAavePool pool = new MockAavePool(deployer, address(oracle));

        // ConciergeRegistry (UUPS proxy).
        ConciergeRegistry impl = new ConciergeRegistry();
        bytes memory initData = abi.encodeCall(ConciergeRegistry.initialize, (deployer));
        ConciergeRegistryProxy proxy = new ConciergeRegistryProxy(address(impl), initData);

        vm.stopBroadcast();

        console2.log("DEPLOYED aavePool %s", address(pool));
        console2.log("DEPLOYED aaveOracle %s", address(oracle));
        console2.log("DEPLOYED sUSDe %s", address(susde));
        console2.log("DEPLOYED USDC %s", address(usdc));
        console2.log("DEPLOYED USDe %s", address(usde));
        console2.log("DEPLOYED USDY %s", address(usdy));
        console2.log("DEPLOYED mETH %s", address(meth));
        console2.log("DEPLOYED WMNT %s", address(wmnt));
        console2.log("DEPLOYED conciergeRegistryImpl %s", address(impl));
        console2.log("DEPLOYED conciergeRegistry %s", address(proxy));
    }
}
