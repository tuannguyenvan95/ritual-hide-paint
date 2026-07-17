// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {RitualHidePaint} from "../src/RitualHidePaint.sol";
import {Agent} from "../src/Agent.sol";
import {GameNFT} from "../src/GameNFT.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Agent (TEE Mockable)
        Agent agent = new Agent();
        console.log("Agent deployed at:", address(agent));

        // 2. Deploy GameNFT
        GameNFT nft = new GameNFT();
        console.log("GameNFT deployed at:", address(nft));

        // 3. Deploy Main Game Contract
        RitualHidePaint game = new RitualHidePaint(address(agent), address(nft));
        console.log("RitualHidePaint deployed at:", address(game));

        // 4. Setup permissions
        nft.setGameContract(address(game));
        console.log("GameNFT linked to Game contract");

        // 5. Fund the game contract for rewards (optional, but good for daily challenge)
        // Ensure deployer has enough RITUAL to fund
        (bool success, ) = address(game).call{value: 0.1 ether}("");
        require(success, "Funding failed");
        console.log("Game contract funded with 0.1 RITUAL");

        vm.stopBroadcast();
    }
}
