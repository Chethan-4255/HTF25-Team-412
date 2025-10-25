// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title EventPravesh
 * @dev This is the NFT contract for our ticketing platform.
 * It is "Ownable", meaning only the platform (owner) can mint new tickets.
 * It uses ERC721URIStorage to link each token ID to an off-chain metadata JSON.
 */
contract EventPravesh is ERC721, ERC721URIStorage, Ownable {
    // Use OpenZeppelin's Counter library for token IDs
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    /**
     * @dev Sets the contract name ("EventPravesh"), symbol ("EP"),
     * and transfers ownership to the 'initialOwner' (your deployer wallet).
     */
    constructor()
        ERC721("EventPravesh", "EP")
        Ownable()
    {}

    /**
     * @dev Mints a new ticket (NFT) to a user.
     * This function is the *only* way new tickets are created.
     * - `onlyOwner` modifier ensures only your platform's Gas Station wallet can call this.
     * - `to`: The user's custodial wallet address.
     * - `uri`: The secure API endpoint pointing to this ticket's metadata (e.g., "https://api.eventpravesh.com/nft/123")
     * Returns the newly created `tokenId`.
     */
    function safeMint(address to, string memory uri)
        public
        onlyOwner
        returns (uint256)
    {
        // Get the next available token ID
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Create the new NFT and assign it to the 'to' address
        _safeMint(to, tokenId);
        
        // Set the metadata URI for this specific token ID
        _setTokenURI(tokenId, uri);
        
        return tokenId;
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}