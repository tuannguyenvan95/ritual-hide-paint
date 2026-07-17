// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

// Interface for Ritual's TEE precompiles (Mockable)
interface IAgent {
    function requestAIHint(uint256 gameId, string memory canvasState) external returns (string memory);
    function setMockMode(bool _mockMode) external;
}

contract Agent is IAgent, Ownable {
    bool public mockMode;

    event AIRequest(uint256 indexed gameId, string canvasState);
    event AIResponse(uint256 indexed gameId, string response);

    constructor() Ownable() {
        mockMode = true; // Default to mock mode for demo
    }

    function setMockMode(bool _mockMode) external onlyOwner {
        mockMode = _mockMode;
    }

    function requestAIHint(uint256 gameId, string memory canvasState) external returns (string memory) {
        emit AIRequest(gameId, canvasState);

        if (mockMode) {
            // Mock logic: return a dummy hint based on the prompt
            string memory response = "AI Suggestion: Use 'Zoom' item to check the top right corner of the canvas.";
            emit AIResponse(gameId, response);
            return response;
        } else {
            // Real TEE precompile call would go here
            // e.g. TEEPrecompile.call(prompt);
            string memory response = "TEE_RESPONSE_PENDING";
            emit AIResponse(gameId, response);
            return response;
        }
    }
}
