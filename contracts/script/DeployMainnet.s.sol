// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";

import { ConciergeRegistry } from "../src/ConciergeRegistry.sol";
import { ConciergeRegistryProxy } from "../src/ConciergeRegistryProxy.sol";

/// @notice Mantle Mainnet (chainid 5000) deploy — ConciergeRegistry impl + UUPS proxy only.
///
/// Why a dedicated script (not DeployAll): on mainnet the real protocol addresses
/// come from the shared address book, so HelperConfig is unnecessary — and
/// HelperConfig is 43,142 bytes, over the 24,576 EVM code-size limit, so deploying
/// it inside the broadcast (as DeployAll does for the Sepolia mock path) reverts on
/// mainnet. This flat script deploys only the two contracts that must land on-chain.
///
/// Usage:
///   forge script script/DeployMainnet.s.sol \
///     --rpc-url $MANTLE_RPC_URL \
///     --private-key $OPS_PRIVATE_KEY \
///     --broadcast --verify
contract DeployMainnet is Script {
    function run() external {
        address deployer = tx.origin;

        require(block.chainid == 5000, "DeployMainnet: not Mantle Mainnet (5000)");
        require(
            deployer.balance >= 0.1 ether, "DeployMainnet: deployer balance < 0.1 MNT, top up first"
        );

        vm.startBroadcast();

        ConciergeRegistry impl = new ConciergeRegistry();
        bytes memory initData = abi.encodeCall(ConciergeRegistry.initialize, (deployer));
        ConciergeRegistryProxy proxy = new ConciergeRegistryProxy(address(impl), initData);

        vm.stopBroadcast();

        console2.log("DEPLOYED conciergeRegistryImpl %s", address(impl));
        console2.log("DEPLOYED conciergeRegistry %s", address(proxy));
    }
}
