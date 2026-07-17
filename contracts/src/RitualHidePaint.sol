// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {IAgent} from "./Agent.sol";

interface IGameNFT {
    function mintBadge(address to, string memory uri) external returns (uint256);
}

contract RitualHidePaint is Ownable {
    IAgent public aiAgent;
    IGameNFT public gameNFT;

    enum GameState { Created, InProgress, Finished }

    struct Game {
        uint256 id;
        address hider;
        address seeker;
        uint256 betAmount;
        uint256 mapId;
        GameState state;
        address winner;
        string canvasHistory; // IPFS CID for replay
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public winStreaks;
    
    // Config
    uint256 public minimumBet = 0.01 ether; // 0.01 RITUAL

    event GameCreated(uint256 indexed gameId, address indexed hider, uint256 betAmount, uint256 mapId);
    event GameJoined(uint256 indexed gameId, address indexed seeker);
    event GameResolved(uint256 indexed gameId, address indexed winner, uint256 rewardAmount);
    event ItemUsed(uint256 indexed gameId, address indexed player, string itemType);
    event StreakReward(address indexed player, uint256 streakCount, uint256 nftId);

    constructor(address _aiAgent, address _gameNFT) Ownable() {
        aiAgent = IAgent(_aiAgent);
        gameNFT = IGameNFT(_gameNFT);
    }

    // Hider creates a game with a bet
    function createGame(uint256 mapId) external payable {
        require(msg.value >= minimumBet, "Bet too low");

        uint256 gameId = nextGameId++;
        games[gameId] = Game({
            id: gameId,
            hider: msg.sender,
            seeker: address(0),
            betAmount: msg.value,
            mapId: mapId,
            state: GameState.Created,
            winner: address(0),
            canvasHistory: ""
        });

        emit GameCreated(gameId, msg.sender, msg.value, mapId);
    }

    // Seeker joins a game, matching the bet
    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];
        require(game.state == GameState.Created, "Game not available");
        require(msg.sender != game.hider, "Cannot play against yourself");
        require(msg.value == game.betAmount, "Must match the bet amount");

        game.seeker = msg.sender;
        game.state = GameState.InProgress;

        emit GameJoined(gameId, msg.sender);
    }

    // Use an item during the game (e.g. Blur, Zoom)
    function useItem(uint256 gameId, string memory itemType) external {
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        require(msg.sender == game.hider || msg.sender == game.seeker, "Not a player");

        // Here we could deduct points, charge extra fee, or limit uses.
        // For demo, we just emit the event for the frontend to render the item effect.
        emit ItemUsed(gameId, msg.sender, itemType);
    }

    // Request AI hint for the seeker
    function requestHint(uint256 gameId, string memory currentCanvasState) external returns (string memory) {
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        require(msg.sender == game.seeker, "Only seeker can request hints");

        // Call the AI Agent
        return aiAgent.requestAIHint(gameId, currentCanvasState);
    }

    // Resolve the game, distributing the pot and handling streaks
    // In a fully trustless version, this would rely on a ZK-proof or oracle.
    // For this demo, we allow the server/scheduler to resolve it, or players to mutually agree.
    function resolveGame(uint256 gameId, address winner, string memory canvasHistoryCID) external onlyOwner {
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        require(winner == game.hider || winner == game.seeker, "Invalid winner");

        game.state = GameState.Finished;
        game.winner = winner;
        game.canvasHistory = canvasHistoryCID;

        uint256 pot = game.betAmount * 2;
        
        // Handle payouts
        (bool success, ) = winner.call{value: pot}("");
        require(success, "Transfer failed");

        emit GameResolved(gameId, winner, pot);

        // Update streaks
        _updateStreak(winner);
        address loser = (winner == game.hider) ? game.seeker : game.hider;
        winStreaks[loser] = 0;
    }

    function _updateStreak(address player) internal {
        winStreaks[player] += 1;
        uint256 streak = winStreaks[player];

        // Award NFT for 3-win streak
        if (streak > 0 && streak % 3 == 0) {
            uint256 nftId = gameNFT.mintBadge(player, "ipfs://mock-badge-uri");
            emit StreakReward(player, streak, nftId);
        }
    }

    // Owner can fund the contract for daily challenge rewards
    receive() external payable {}
}
