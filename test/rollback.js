const MockedRollback = artifacts.require('./MockedRollback.sol')
const suomi = artifacts.require('./suomi.sol')



const { assertFail, assertEqual } = require('./utils.js')
var crypto = require('crypto')

contract('Rollback', accounts => {
    const acc1 = accounts[0]
    const acc2 = accounts[1]
    const acc3 = accounts[2]
    const acc4 = accounts[3]



    let rollback
    let suomi

    it('deploy', async() => {
        rollback = await MockedRollback.new()
        suomi = await suomi.new()

        console.log("rollback address=\t" + rollback.address)
        console.log("suomi address=\t" + suomi.address)

        // check init params
        assertEqual(await rollback.totalSetCredit(), 0)
        assertEqual(await rollback.totalReturnedCredit(), 0)
        //assertEqual(await rollback.tokenVault(), 0)

        //for test purpose, suomi init to 0 and then can be customized
        assertEqual(await rollback.token(), 0xD850942eF8811f2A866692A623011bDE52a462C1)

    })

    // it('setsuomiVault', async() => {

    //     await rollback.setTokenVault(0x00112233445566778899AABBCCDDEEFF00112233)
    //     assertEqual(await rollback.tokenVault(), 0x00112233445566778899AABBCCDDEEFF00112233)
    // })


    it('setSuomi', async() => {
        //this is only for test, set suomi address and run the co-operate test
        await rollback.setToken(suomi.address);
        assertEqual(await rollback.token(), suomi.address)
    })

    it('setCredit', async() => {

        //credit shuold be set first
        const credit_acc0 = 100 * (10 ** 18);
        const credit_acc1 = 200 * (10 ** 18);
        const credit_acc2 = 300 * (10 ** 18);
        const credit_acc3 = 400 * (10 ** 18);

        await rollback.setCredit(acc1, credit_acc0)
        await rollback.setCredit(acc2, credit_acc1)
        await rollback.setCredit(acc3, credit_acc2)
        await rollback.setCredit(acc4, credit_acc3)

        assertEqual((await rollback.getCredit(acc1))[0], credit_acc0)
        assertEqual((await rollback.getCredit(acc2))[0], credit_acc1)
        assertEqual((await rollback.getCredit(acc3))[0], credit_acc2)
        assertEqual((await rollback.getCredit(acc4))[0], credit_acc3)
        assertEqual(await rollback.totalSetCredit(), credit_acc0 + credit_acc1 + credit_acc2 + credit_acc3)

    })

    it('withDrawETH', async() => {
        //this is only for test, set suomi address and run the co-operate test
        assertEqual(await web3.eth.getBalance(rollback.address), 0);
        await rollback.sendTransaction({ from: acc1, value: web3.toWei(4) })
        await rollback.withdrawETH(acc1, web3.toWei(1));
        assertEqual(await web3.eth.getBalance(rollback.address), web3.toWei(3));
    })

    it('receiveApproval', async() => {

        let b1 = await suomi.balanceOf(acc1)
        let b2 = await suomi.balanceOf(acc2)
        let b3 = await suomi.balanceOf(acc3)
        let b4 = await suomi.balanceOf(acc4)

        assertEqual(await b1, 0)
        assertEqual(await b2, 0)
        assertEqual(await b3, 0)
        assertEqual(await b4, 0)


        //mint in suomi contract
        const suomi_credit_acc0 = 8050;
        const suomi_credit_acc1 = 80500;
        const suomi_credit_acc2 = 100000000;
        const suomi_credit_acc3 = 200000000;

        suomi.mint(acc1, suomi_credit_acc0, true, 0x1)
        suomi.mint(acc2, suomi_credit_acc1, true, 0x2)
        suomi.mint(acc3, suomi_credit_acc2, true, 0x3)
        suomi.mint(acc4, suomi_credit_acc3, true, 0x4)

        assertEqual(await suomi.balanceOf(acc1), suomi_credit_acc0)
        assertEqual(await suomi.balanceOf(acc2), suomi_credit_acc1)
        assertEqual(await suomi.balanceOf(acc3), suomi_credit_acc2)
        assertEqual(await suomi.balanceOf(acc4), suomi_credit_acc3)


        //approve and call in suomi
        //withdraw from suomi to rollback 
        //to transfer from, it must sealed first;
        await suomi.seal();
        assertEqual(await suomi.isSealed(), true);

        //await assertFail(suomi.approveAndCall(rollback.address, suomi_credit_acc0 + 1, '', { from: acc1 }));
        await assertFail(suomi.approveAndCall(rollback.address, 4024, '', { from: acc1 }));

        //test the withdraw

        await rollback.setCredit(acc1, suomi_credit_acc0)

        let balance_temp;
        //withdraw 4025
        balance_temp = await web3.eth.getBalance(rollback.address)
        await suomi.approveAndCall(rollback.address, suomi_credit_acc0 / 2, '', { from: acc1 });

        assertEqual(await suomi.balanceOf(rollback.address), suomi_credit_acc0 / 2)

        const credit = await rollback.getCredit(acc1)
        assertEqual(credit[0], suomi_credit_acc0)
        assertEqual(credit[1], suomi_credit_acc0/2)

        assertEqual(await suomi.balanceOf(acc1), suomi_credit_acc0 / 2);
        assertEqual(await web3.eth.getBalance(rollback.address), balance_temp.sub(suomi_credit_acc0 / 2 / 4025));
        assertEqual(await rollback.totalReturnedCredit(), suomi_credit_acc0 / 2);

        //withdraw the left 4025
        balance_temp = await web3.eth.getBalance(rollback.address)
        await suomi.approveAndCall(rollback.address, suomi_credit_acc0 / 2, '', { from: acc1 });
        assertEqual(await suomi.balanceOf(acc1), 0);
        assertEqual(await web3.eth.getBalance(rollback.address), balance_temp.sub(suomi_credit_acc0 / 2 / 4025));
        assertEqual(await rollback.totalReturnedCredit(), suomi_credit_acc0);

        balance_temp = await web3.eth.getBalance(rollback.address)
        await suomi.approveAndCall(rollback.address, suomi_credit_acc1 / 2, '', { from: acc2 });
        assertEqual(await suomi.balanceOf(acc2), suomi_credit_acc1 / 2);
        assertEqual(await web3.eth.getBalance(rollback.address), balance_temp.sub((suomi_credit_acc1 / 2 / 4025)));
        assertEqual(await rollback.totalReturnedCredit(), suomi_credit_acc0 + suomi_credit_acc1 / 2);

        //withdraw the left 4025
        balance_temp = await web3.eth.getBalance(rollback.address)
        await suomi.approveAndCall(rollback.address, suomi_credit_acc1 / 2, '', { from: acc2 });
        assertEqual(await suomi.balanceOf(acc2), 0);
        assertEqual(await web3.eth.getBalance(rollback.address), balance_temp.sub((suomi_credit_acc1 / 2 / 4025)));
        assertEqual(await rollback.totalReturnedCredit(), suomi_credit_acc0 + suomi_credit_acc1);

    })

    it('withdrawToken', async() => {
        const tempAcct = '0x' + crypto.randomBytes(20).toString('hex')

        await rollback.withdrawToken(tempAcct, 1, {from: acc1})        
        assertEqual(await suomi.balanceOf(tempAcct), 1)
    })

})