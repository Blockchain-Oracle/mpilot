// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";

import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";
import { ConciergeRegistry } from "../src/ConciergeRegistry.sol";
import { ConciergeRegistryProxy } from "../src/ConciergeRegistryProxy.sol";

/// @notice One-shot deploy script for Mantle Sepolia and Mainnet.
///
/// Sepolia (chainid 5003):
///   Calls HelperConfig.getConfig() inside vm.startBroadcast() so all 6 mock
///   token + oracle + pool deployments are captured as CREATE transactions in
///   the broadcast artifact for write-addresses.mjs to parse.
///   Then deploys ConciergeRegistry impl + UUPS proxy.
///
/// Mainnet (chainid 5000):
///   HelperConfig returns real on-chain addresses (no mocks deployed).
///   Only ConciergeRegistry impl + proxy are deployed.
///
/// Usage (Sepolia):
///   forge script script/DeployAll.s.sol \
///     --rpc-url $MANTLE_SEPOLIA_RPC_URL \
///     --private-key $OPS_PRIVATE_KEY \
///     --broadcast --verify
///
/// The [etherscan] block in foundry.toml routes verification to
/// api-sepolia.mantlescan.xyz (chain 5003) automatically.
contract DeployAll is Script {
    function run() external {
        // tx.origin is the broadcaster EOA in both --broadcast and vm.startBroadcast() contexts.
        // msg.sender inside an external call within broadcast is the script contract, not the EOA.
        address deployer = tx.origin;

        // Chain guard first: wrong-chain failure is more actionable than "top up wallet".
        uint256 chainId = block.chainid;
        require(chainId == 5000 || chainId == 5003, "DeployAll: unsupported chain");

        require(
            deployer.balance >= 0.1 ether, "DeployAll: deployer balance < 0.1 MNT, top up first"
        );

        // 2026-06-15 FIX: HelperConfig MUST be deployed INSIDE the broadcast.
        // Previously created off-broadcast, which meant the internal `new MockX(...)`
        // CREATE opcodes inside `_getSepoliaConfig()` ran in the forge simulation
        // VM only — the addresses logged below were correct under simulation but
        // no code landed on Sepolia. Moving the instantiation into the broadcast
        // makes the nested CREATEs real txs.
        vm.startBroadcast();

        HelperConfig helperConfig = new HelperConfig();
        NetworkConfig memory cfg = helperConfig.getConfig();

        // ConciergeRegistry: deploy implementation then wire through UUPS proxy.
        ConciergeRegistry impl = new ConciergeRegistry();
        bytes memory initData = abi.encodeCall(ConciergeRegistry.initialize, (deployer));
        ConciergeRegistryProxy proxy = new ConciergeRegistryProxy(address(impl), initData);

        vm.stopBroadcast();

        // Informational logs — addresses are sourced from broadcast artifact by write-addresses.mjs.
        console2.log("DEPLOYED aavePool %s", cfg.aavePool);
        console2.log("DEPLOYED aaveOracle %s", cfg.aaveOracle);
        console2.log("DEPLOYED sUSDe %s", cfg.sUSDe);
        console2.log("DEPLOYED USDC %s", cfg.USDC);
        console2.log("DEPLOYED USDe %s", cfg.USDe);
        console2.log("DEPLOYED USDY %s", cfg.USDY);
        console2.log("DEPLOYED mETH %s", cfg.mETH);
        console2.log("DEPLOYED WMNT %s", cfg.WMNT);
        console2.log("DEPLOYED conciergeRegistryImpl %s", address(impl));
        console2.log("DEPLOYED conciergeRegistry %s", address(proxy));
    }
}
