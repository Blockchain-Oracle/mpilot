// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Minimal Aave rewards controller mock for integration testing.
/// Admin configures a fixed (reward token, amount) pair; claimAllRewards emits
/// the canonical RewardsClaimed event so the TypeScript log-parser in
/// claimRewards.ts is exercised end-to-end.
contract MockRewardsController {
    // ─── Events ──────────────────────────────────────────────────────────────

    event RewardsClaimed(
        address indexed user,
        address indexed reward,
        address indexed to,
        address caller,
        uint256 amount
    );

    // ─── State ────────────────────────────────────────────────────────────────

    address public immutable admin;
    address public rewardToken;
    uint256 public rewardAmount;

    constructor(address admin_) {
        require(admin_ != address(0), "zero admin");
        admin = admin_;
    }

    // ─── Admin config ─────────────────────────────────────────────────────────

    function mockSetReward(address token, uint256 amount) external {
        require(msg.sender == admin, "not admin");
        require(token != address(0), "zero token");
        rewardToken = token;
        rewardAmount = amount;
    }

    // ─── IRewardsController surface ───────────────────────────────────────────

    function claimAllRewards(
        address[] calldata, /* assets */
        address to
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts) {
        rewardsList = new address[](1);
        claimedAmounts = new uint256[](1);
        rewardsList[0] = rewardToken;
        claimedAmounts[0] = rewardAmount;
        emit RewardsClaimed(msg.sender, rewardToken, to, msg.sender, rewardAmount);
    }
}
