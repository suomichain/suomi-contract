const MockedExchange = artifacts.require('./MockedExchange.sol')
const suomi = artifacts.require('./suomi.sol')



const { assertFail, assertEqual } = require('./utils.js')
var crypto = require('crypto')

contract('MockedExchange', accounts => {
    const acc0 = accounts[0]
    const acc1 = accounts[1]
    const acc2 = accounts[2]
    const acc3 = accounts[3]

    const max_returned = 402500
    const ex_rate = 4025 //for test purpose, set to 402500 for easy test

    let exchange
    let suomi

    it('deploy', async() => {
        exchange = await MockedExchange.new()
        suomi = await suomi.new()

        console.log("exchange address=\t" + exchange.address)
        console.log("suomi address=\t" + suomi.address)

        // check init params
        
            //assertEqual(await rollback.tokenVault(), 0)
            // check init params
        assertEqual(await exchange.rate(), 4025)
        assertEqual(await exchange.tokenQuota(), 402500 * (10 ** 18))
        assertEqual(await exchange.tokenToEtherAllowed(), true)
        assertEqual(await suomi.balanceOf(exchange.address), 0)
            //for test purpose, suomi init to 0 and then can be customized
        assertEqual(await exchange.token(), 0xD850942eF8811f2A866692A623011bDE52a462C1)


        //display all the balance of accounts
        console.log("account[0] balance is\t" + await web3.fromWei(web3.eth.getBalance(acc0)));
        console.log("account[1] balance is\t" + await web3.fromWei(web3.eth.getBalance(acc1)));
        console.log("account[2] balance is\t" + await web3.fromWei(web3.eth.getBalance(acc2)));
        console.log("account[3] balance is\t" + await web3.fromWei(web3.eth.getBalance(acc3)));
    })

    //suomi address
    it('setToken', async() => {
        await exchange.setToken(suomi.address);
        assertEqual(await exchange.token(), suomi.address)
    })


    //exchange rate
    it('setRate', async() => {
        await exchange.setRate(1000);
        assertEqual(await exchange.rate(), 1000)
        await exchange.setRate(ex_rate);
        assertEqual(await exchange.rate(), ex_rate)
    })

    //maximum token returned for each address
    it('setTokenQuota', async() => {
        await exchange.setTokenQuota(1000 * (10 ** 18));
        assertEqual(await exchange.tokenQuota(), 1000 * (10 ** 18))
        await exchange.setTokenQuota(max_returned);
        assertEqual(await exchange.tokenQuota(), max_returned)
    })

    //tokentoether allowed flag
    it('setTokenToEtherAllowed', async() => {
        await exchange.setTokenToEtherAllowed(false);
        assertEqual(await exchange.tokenToEtherAllowed(), false)
        await exchange.setTokenToEtherAllowed(true);
        assertEqual(await exchange.tokenToEtherAllowed(), true)
    })

    //withdraw ether
    it('withdrawEther', async() => {
        assertEqual(await web3.eth.getBalance(exchange.address), 0);
        await exchange.sendTransaction({ from: acc0, value: web3.toWei(5) })
        await exchange.withdrawEther(acc0, web3.toWei(1));
        assertEqual(await web3.eth.getBalance(exchange.address), web3.toWei(4));
    })

    //approve and call
    it('receiveApproval', async() => {
        assertEqual(await suomi.balanceOf(acc0), 0)
        assertEqual(await suomi.balanceOf(acc1), 0)
        assertEqual(await suomi.balanceOf(acc2), 0)
        assertEqual(await suomi.balanceOf(acc3), 0)

        //mint in suomi contract
        const suomi_credit_acc0 = max_returned;
        const suomi_credit_acc1 = max_returned + 10;
        const suomi_credit_acc2 = max_returned * 2;
        const suomi_credit_acc3 = max_returned * 3;

        suomi.mint(acc0, suomi_credit_acc0, true, 0x1)
        suomi.mint(acc1, suomi_credit_acc1, true, 0x2)
        suomi.mint(acc2, suomi_credit_acc2, true, 0x3)
        suomi.mint(acc3, suomi_credit_acc3, true, 0x4)

        assertEqual(await suomi.balanceOf(acc0), suomi_credit_acc0)
        assertEqual(await suomi.balanceOf(acc1), suomi_credit_acc1)
        assertEqual(await suomi.balanceOf(acc2), suomi_credit_acc2)
        assertEqual(await suomi.balanceOf(acc3), suomi_credit_acc3)

        //approve and call in suomi
        //withdraw from suomi to exchange 
        //to transfer from, it must sealed first;
        await suomi.seal();
        assertEqual(await suomi.isSealed(), true);

        var bal_exchange = await web3.eth.getBalance(exchange.address)

        //test half exchange
        suomi.approveAndCall(exchange.address, suomi_credit_acc0 / 2, '', { from: acc0 });
        assertEqual(await suomi.balanceOf(acc0), suomi_credit_acc0 / 2)
        assertEqual(await suomi.balanceOf(exchange.address), suomi_credit_acc0 / 2)
        assertEqual(await web3.eth.getBalance(exchange.address), bal_exchange.sub(suomi_credit_acc0 / 2 / ex_rate));
        assertEqual(await exchange.quotaUsed(acc0), suomi_credit_acc0 / 2)


        var bal_exchange = await web3.eth.getBalance(exchange.address)
        suomi.approveAndCall(exchange.address, suomi_credit_acc0 / 2, '', { from: acc0 });
        assertEqual(await suomi.balanceOf(acc0), 0)
        assertEqual(await suomi.balanceOf(exchange.address), suomi_credit_acc0)
        assertEqual(await web3.eth.getBalance(exchange.address), bal_exchange.sub(suomi_credit_acc0 / 2 / ex_rate));
        assertEqual(await exchange.quotaUsed(acc0), suomi_credit_acc0)



        var bal_exchange = await web3.eth.getBalance(exchange.address)

        //test max exchange+10
        suomi.approveAndCall(exchange.address, suomi_credit_acc1, '', { from: acc1 });
        assertEqual(await suomi.balanceOf(acc1), 10)
        assertEqual(await suomi.balanceOf(exchange.address), suomi_credit_acc0 + suomi_credit_acc1 - 10)
        assertEqual(await web3.eth.getBalance(exchange.address), bal_exchange.sub((suomi_credit_acc1 - 10) / ex_rate));
        await assertFail(suomi.approveAndCall(exchange.address, 1, '', { from: acc1 })); //more that what can exchange
        assertEqual(await exchange.quotaUsed(acc1), suomi_credit_acc1 - 10)




    })




    it('withdrawToken', async() => {
        const tempAcct = '0x' + crypto.randomBytes(20).toString('hex')

        await exchange.withdrawToken(tempAcct, 1, { from: acc0 })
        assertEqual(await suomi.balanceOf(tempAcct), 1)
    })



})