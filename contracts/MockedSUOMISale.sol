pragma solidity ^0.4.11;
import './SuomiSale.sol';

contract MockedsuomiSale is suomiSale {
    uint32 mockedBlockTime;

    function blockTime() constant returns (uint32) {
        return mockedBlockTime;
    }

    function setMockedBlockTime(uint32 _time) {
        mockedBlockTime = _time;
    }
}