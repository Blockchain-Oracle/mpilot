// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {ConciergeRegistry} from "../src/ConciergeRegistry.sol";
import {ConciergeRegistryProxy} from "../src/ConciergeRegistryProxy.sol";
import {IConciergeRegistry} from "../src/interfaces/IConciergeRegistry.sol";
import {
    NotAgentOwner,
    AgentInactive,
    InvalidValidator,
    EmptyGoalHash,
    PolicyTooLarge,
    AgentNotFound
} from "../src/errors/ConciergeErrors.sol";

contract ConciergeRegistryTest is Test {
    ConciergeRegistry internal impl;
    ConciergeRegistry internal registry; // cast to the proxy address

    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal pauser = makeAddr("pauser");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal charlie = makeAddr("charlie");

    address internal validator = makeAddr("validator");
    bytes32 internal goalHash = keccak256("goal-v1");
    bytes internal policyData = abi.encode("policy-v1");

    function setUp() public {
        impl = new ConciergeRegistry();

        bytes memory initData = abi.encodeCall(ConciergeRegistry.initialize, (admin));
        ConciergeRegistryProxy proxy = new ConciergeRegistryProxy(address(impl), initData);
        registry = ConciergeRegistry(address(proxy));

        bytes32 operatorRole = registry.AGENT_OPERATOR_ROLE();
        bytes32 pauserRole = registry.PAUSER_ROLE();

        vm.startPrank(admin);
        registry.grantRole(operatorRole, operator);
        registry.grantRole(pauserRole, pauser);
        vm.stopPrank();
    }

    // ─── Deployment ────────────────────────────────────────────────────────

    function test_initialize_adminHasAdminRole() public view {
        assertTrue(registry.hasRole(registry.ADMIN_ROLE(), admin));
    }

    function test_initialize_adminHasPauserRole() public view {
        assertTrue(registry.hasRole(registry.PAUSER_ROLE(), admin));
    }

    function test_initialize_nextAgentIdStartsAtOne() public view {
        assertEq(registry.nextAgentId(), 1);
    }

    function test_initialize_notPaused() public view {
        assertFalse(registry.paused());
    }

    function test_implConstructor_disablesInitializers() public {
        // Direct call to initialize on the implementation (not proxy) must revert
        vm.expectRevert();
        impl.initialize(admin);
    }

    // ─── registerAgent ─────────────────────────────────────────────────────

    function test_registerAgent_mintsFirstIdAsOne() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);
        assertEq(id, 1);
    }

    function test_registerAgent_incremensNextAgentId() public {
        vm.prank(operator);
        registry.registerAgent(alice, validator, goalHash, policyData);
        vm.prank(operator);
        uint256 id2 = registry.registerAgent(bob, validator, goalHash, policyData);
        assertEq(id2, 2);
        assertEq(registry.nextAgentId(), 3);
    }

    function test_registerAgent_storesRecord() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        IConciergeRegistry.AgentRecord memory rec = registry.getAgent(id);
        assertEq(rec.owner, alice);
        assertEq(rec.sessionKeyValidator, validator);
        assertEq(rec.goalHash, goalHash);
        assertEq(rec.policyData, policyData);
        assertTrue(rec.active);
        assertGt(rec.activatedAt, 0);
    }

    function test_registerAgent_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IConciergeRegistry.AgentRegistered(1, alice, validator, goalHash);

        vm.prank(operator);
        registry.registerAgent(alice, validator, goalHash, policyData);
    }

    function test_registerAgent_reverts_zeroValidator() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(InvalidValidator.selector, address(0)));
        registry.registerAgent(alice, address(0), goalHash, policyData);
    }

    function test_registerAgent_reverts_emptyGoalHash() public {
        vm.prank(operator);
        vm.expectRevert(EmptyGoalHash.selector);
        registry.registerAgent(alice, validator, bytes32(0), policyData);
    }

    function test_registerAgent_reverts_policyTooLarge() public {
        bytes memory tooBig = new bytes(4097);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(PolicyTooLarge.selector, uint256(4097)));
        registry.registerAgent(alice, validator, goalHash, tooBig);
    }

    function test_registerAgent_reverts_noOperatorRole() public {
        vm.expectRevert();
        vm.prank(bob);
        registry.registerAgent(alice, validator, goalHash, policyData);
    }

    function test_registerAgent_acceptsMaxPolicySize() public {
        bytes memory maxPolicy = new bytes(4096);
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, maxPolicy);
        assertEq(registry.getAgent(id).policyData.length, 4096);
    }

    // ─── updateGoal ────────────────────────────────────────────────────────

    function test_updateGoal_succeeds_asOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes32 newHash = keccak256("goal-v2");
        vm.prank(alice);
        registry.updateGoal(id, newHash);

        assertEq(registry.getAgent(id).goalHash, newHash);
    }

    function test_updateGoal_emitsGoalUpdated() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes32 newHash = keccak256("goal-v2");
        vm.expectEmit(true, true, false, false);
        emit IConciergeRegistry.GoalUpdated(id, newHash);

        vm.prank(alice);
        registry.updateGoal(id, newHash);
    }

    function test_updateGoal_reverts_notOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes32 newHash = keccak256("goal-v2");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(NotAgentOwner.selector, id, bob));
        registry.updateGoal(id, newHash);
    }

    function test_updateGoal_reverts_emptyHash() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        vm.expectRevert(EmptyGoalHash.selector);
        registry.updateGoal(id, bytes32(0));
    }

    function test_updateGoal_reverts_agentInactive() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        registry.setActive(id, false);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AgentInactive.selector, id));
        registry.updateGoal(id, keccak256("goal-v2"));
    }

    function test_updateGoal_reverts_agentNotFound() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AgentNotFound.selector, uint256(99)));
        registry.updateGoal(99, keccak256("x"));
    }

    // ─── updatePolicy ──────────────────────────────────────────────────────

    function test_updatePolicy_succeeds_asOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes memory newPolicy = abi.encode("policy-v2");
        vm.prank(alice);
        registry.updatePolicy(id, newPolicy);

        assertEq(registry.getAgent(id).policyData, newPolicy);
    }

    function test_updatePolicy_emitsPolicyUpdated() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.expectEmit(true, false, false, false);
        emit IConciergeRegistry.PolicyUpdated(id);

        vm.prank(alice);
        registry.updatePolicy(id, abi.encode("v2"));
    }

    function test_updatePolicy_reverts_notOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(NotAgentOwner.selector, id, bob));
        registry.updatePolicy(id, abi.encode("v2"));
    }

    function test_updatePolicy_reverts_policyTooLarge() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes memory tooBig = new bytes(4097);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PolicyTooLarge.selector, uint256(4097)));
        registry.updatePolicy(id, tooBig);
    }

    function test_updatePolicy_storageUnchanged_onRevert() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes memory original = registry.getAgent(id).policyData;
        bytes memory tooBig = new bytes(4097);
        vm.prank(alice);
        vm.expectRevert();
        registry.updatePolicy(id, tooBig);

        assertEq(registry.getAgent(id).policyData, original);
    }

    // ─── setActive ─────────────────────────────────────────────────────────

    function test_setActive_deactivates() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        registry.setActive(id, false);

        assertFalse(registry.getAgent(id).active);
    }

    function test_setActive_reactivates() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        registry.setActive(id, false);
        vm.prank(alice);
        registry.setActive(id, true);

        assertTrue(registry.getAgent(id).active);
    }

    function test_setActive_emitsActiveSet() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.expectEmit(true, false, false, true);
        emit IConciergeRegistry.ActiveSet(id, false);

        vm.prank(alice);
        registry.setActive(id, false);
    }

    function test_setActive_reverts_notOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(NotAgentOwner.selector, id, bob));
        registry.setActive(id, false);
    }

    // getAgent succeeds on inactive agent (never auto-reverts)
    function test_getAgent_returnsInactiveRecord() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        registry.setActive(id, false);

        IConciergeRegistry.AgentRecord memory rec = registry.getAgent(id);
        assertFalse(rec.active, "getAgent must return active=false, not revert");
    }

    // ─── transferAgent ─────────────────────────────────────────────────────

    function test_transferAgent_updatesOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        registry.transferAgent(id, charlie);

        assertEq(registry.getAgent(id).owner, charlie);
    }

    function test_transferAgent_updatesOwnerIndex() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(alice);
        registry.transferAgent(id, charlie);

        uint256[] memory aliceIds = registry.agentsByOwner(alice);
        uint256[] memory charlieIds = registry.agentsByOwner(charlie);

        assertEq(aliceIds.length, 0, "alice should have no agents after transfer");
        assertEq(charlieIds.length, 1, "charlie should have 1 agent");
        assertEq(charlieIds[0], id);
    }

    function test_transferAgent_emitsEvent() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.expectEmit(true, true, true, false);
        emit IConciergeRegistry.AgentTransferred(id, alice, charlie);

        vm.prank(alice);
        registry.transferAgent(id, charlie);
    }

    function test_transferAgent_reverts_notOwner() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(NotAgentOwner.selector, id, bob));
        registry.transferAgent(id, charlie);
    }

    // ─── agentsByOwner ─────────────────────────────────────────────────────

    function test_agentsByOwner_returnsMultiple() public {
        vm.prank(operator);
        uint256 id1 = registry.registerAgent(alice, validator, goalHash, policyData);
        vm.prank(operator);
        uint256 id2 =
            registry.registerAgent(alice, validator, keccak256("goal-2"), policyData);

        uint256[] memory ids = registry.agentsByOwner(alice);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }

    function test_agentsByOwner_emptyForUnknownOwner() public {
        assertEq(registry.agentsByOwner(makeAddr("nobody")).length, 0);
    }

    // ─── getAgent ──────────────────────────────────────────────────────────

    function test_getAgent_reverts_agentNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(AgentNotFound.selector, uint256(99)));
        registry.getAgent(99);
    }

    // ─── Pause / unpause ───────────────────────────────────────────────────

    function test_pause_blocksAllMutations() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(pauser);
        registry.pause();

        // registerAgent
        vm.prank(operator);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.registerAgent(alice, validator, goalHash, policyData);

        // updateGoal
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.updateGoal(id, keccak256("x"));

        // updatePolicy
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.updatePolicy(id, abi.encode("v2"));

        // setActive
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.setActive(id, false);

        // transferAgent
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.transferAgent(id, charlie);
    }

    function test_pause_doesNotBlockReads() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(pauser);
        registry.pause();

        // Must succeed — reads are NEVER pause-gated
        IConciergeRegistry.AgentRecord memory rec = registry.getAgent(id);
        assertEq(rec.owner, alice);

        uint256[] memory ids = registry.agentsByOwner(alice);
        assertEq(ids.length, 1);
    }

    function test_unpause_restoresMutations() public {
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        vm.prank(pauser);
        registry.pause();

        vm.prank(pauser);
        registry.unpause();

        bytes32 newHash = keccak256("goal-v3");
        vm.prank(alice);
        registry.updateGoal(id, newHash);
        assertEq(registry.getAgent(id).goalHash, newHash);
    }

    function test_pause_reverts_noPauserRole() public {
        vm.prank(bob);
        vm.expectRevert();
        registry.pause();
    }

    // ─── Role access ───────────────────────────────────────────────────────

    function test_roles_adminCanGrantOperator() public {
        bytes32 role = registry.AGENT_OPERATOR_ROLE();
        vm.prank(admin);
        registry.grantRole(role, charlie);
        assertTrue(registry.hasRole(role, charlie));
    }

    function test_roles_operatorCanRegister() public {
        bytes32 role = registry.AGENT_OPERATOR_ROLE();
        vm.prank(admin);
        registry.grantRole(role, charlie);

        vm.prank(charlie);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);
        assertEq(id, 1);
    }

    // ─── UUPS upgrade gate ─────────────────────────────────────────────────

    function test_upgrade_reverts_nonAdmin() public {
        ConciergeRegistry newImpl = new ConciergeRegistry();
        vm.prank(bob);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgrade_succeeds_asAdmin() public {
        ConciergeRegistry newImpl = new ConciergeRegistry();
        vm.prank(admin);
        registry.upgradeToAndCall(address(newImpl), "");
        // State preserved after upgrade
        assertEq(registry.nextAgentId(), 1);
        assertTrue(registry.hasRole(registry.ADMIN_ROLE(), admin));
    }

    // ─── Fuzz ──────────────────────────────────────────────────────────────

    function testFuzz_registerAgent_idAlwaysIncrements(uint8 count) public {
        count = uint8(bound(count, 1, 50));
        for (uint256 i = 0; i < count; i++) {
            vm.prank(operator);
            uint256 id =
                registry.registerAgent(alice, validator, keccak256(abi.encode(i)), policyData);
            assertEq(id, i + 1);
        }
        assertEq(registry.nextAgentId(), uint256(count) + 1);
    }

    function testFuzz_updatePolicy_rejectsOversized(uint16 rawSize) public {
        uint256 size = bound(rawSize, 4097, 65535);
        vm.prank(operator);
        uint256 id = registry.registerAgent(alice, validator, goalHash, policyData);

        bytes memory tooBig = new bytes(size);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PolicyTooLarge.selector, size));
        registry.updatePolicy(id, tooBig);
    }
}
