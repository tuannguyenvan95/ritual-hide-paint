// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {RitualHidePaint} from "../src/RitualHidePaint.sol";
import {Agent} from "../src/Agent.sol";
import {GameNFT} from "../src/GameNFT.sol";

contract RitualHidePaintTest is Test {
    RitualHidePaint public game;
    Agent public agent;
    GameNFT public nft;

    address public owner = address(this);
    address public hider = address(0x1);
    address public seeker = address(0x2);

    function setUp() public {
        agent = new Agent();
        nft = new GameNFT();
        game = new RitualHidePaint(address(agent), address(nft));
        
        nft.setGameContract(address(game));
        
        vm.deal(hider, 10 ether);
        vm.deal(seeker, 10 ether);
    }

    function test_CreateGame() public {
        vm.prank(hider);
        game.createGame{value: 1 ether}(1);

        (uint256 id, address _hider, address _seeker, uint256 betAmount, uint256 mapId, , , ) = game.games(0);
        
        assertEq(id, 0);
        assertEq(_hider, hider);
        assertEq(_seeker, address(0));
        assertEq(betAmount, 1 ether);
        assertEq(mapId, 1);
        assertEq(address(game).balance, 1 ether);
    }

    function test_JoinGame() public {
        vm.prank(hider);
        game.createGame{value: 1 ether}(1);

        vm.prank(seeker);
        game.joinGame{value: 1 ether}(0);

        ( , , address _seeker, , , , , ) = game.games(0);
        assertEq(_seeker, seeker);
        assertEq(address(game).balance, 2 ether);
    }

    function test_UseItem() public {
        vm.prank(hider);
        game.createGame{value: 1 ether}(1);

        vm.prank(seeker);
        game.joinGame{value: 1 ether}(0);

        vm.prank(hider);
        game.useItem(0, "Blur");
    }

    function test_RequestHintMockMode() public {
        vm.prank(hider);
        game.createGame{value: 1 ether}(1);

        vm.prank(seeker);
        game.joinGame{value: 1 ether}(0);

        vm.prank(seeker);
        string memory hint = game.requestHint(0, "mock_canvas_data");
        assertEq(hint, "AI Suggestion: Use 'Zoom' item to check the top right corner of the canvas.");
    }

    function test_ResolveGameAndStreaks() public {
        vm.prank(hider);
        game.createGame{value: 1 ether}(1);

        vm.prank(seeker);
        game.joinGame{value: 1 ether}(0);

        uint256 initialBalance = seeker.balance;
        
        // Resolve Game (Owner calls)
        game.resolveGame(0, seeker, "ipfs://mock-cid");

        assertEq(seeker.balance, initialBalance + 2 ether);
        assertEq(game.winStreaks(seeker), 1);
        
        // Play 2 more games to hit streak 3 and get NFT
        vm.prank(hider);
        game.createGame{value: 1 ether}(1);
        vm.prank(seeker);
        game.joinGame{value: 1 ether}(1);
        game.resolveGame(1, seeker, "ipfs://mock-cid2");

        vm.prank(hider);
        game.createGame{value: 1 ether}(1);
        vm.prank(seeker);
        game.joinGame{value: 1 ether}(2);
        game.resolveGame(2, seeker, "ipfs://mock-cid3");

        assertEq(game.winStreaks(seeker), 3);
        assertEq(nft.balanceOf(seeker), 1); // Received badge
    }
}
