// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract GameNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    address public gameContract;

    modifier onlyGame() {
        require(msg.sender == gameContract || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() ERC721("Ritual Hide & Paint Badge", "RHPB") Ownable() {}

    function setGameContract(address _gameContract) external onlyOwner {
        gameContract = _gameContract;
    }

    function mintBadge(address to, string memory uri) external onlyGame returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }
}
