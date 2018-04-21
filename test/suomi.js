const suomi = artifacts.require('./suomi.sol')
const { assertFail, assertEqual } = require('./utils.js')
var crypto = require('crypto')

contract('suomi', accounts => {
    const acc1 = accounts[0]
    const acc2 = accounts[1]
    const acc3 = accounts[2]

    let suomi
    it('deploy', async () => {
        suomi = await suomi.new()
        // check init params
        assertEqual(await suomi.name(), 'SUOMI Token')
        assertEqual(await suomi.decimals(), 18)
        assertEqual(await suomi.symbol(), 'suomi')

        assertEqual(await suomi.totalSupply(), 0)
    })

    it('mint', async () => {
        const m1 = 100
        const m2_1 = 100
        const m2_2 = 100
        const m3 = 500

        await suomi.mint(acc1, m1, true, 0)
        await suomi.mint(acc2, m2_1, true, 0)
        await suomi.mint(acc2, m2_2, true, 0)
        await suomi.mint(acc3, m3, false, 0)

        assertEqual(await suomi.balanceOf(acc1), m1)
        assertEqual(await suomi.balanceOf(acc2), m2_1 + m2_2)
        assertEqual(await suomi.balanceOf(acc3), m3)

        assertEqual(await suomi.totalSupply(), m1 + m2_1 + m2_2 + m3)
    })

    it('seal', async () => {
        const bonus = 1000
        const rawTokensSupplied = 300

        const b1 = await suomi.balanceOf(acc1)
        const b2 = await suomi.balanceOf(acc2)
        const b3 = await suomi.balanceOf(acc3)
        
        await suomi.offerBonus(bonus)
        await suomi.seal()

        assertEqual(await suomi.totalSupply(), b1.add(b2).add(b3).add(bonus))

        assertEqual(await suomi.owner(), 0)
        // mint disabled
        await assertFail(suomi.mint(acc1, 1, true, 0))

        assertEqual(await suomi.balanceOf(acc1), b1.add(b1.mul(bonus).div(rawTokensSupplied).floor()))
        assertEqual(await suomi.balanceOf(acc2), b2.add(b2.mul(bonus).div(rawTokensSupplied).floor()))
        // acc3 claim no bonus
        assertEqual(await suomi.balanceOf(acc3), b3)
    })

    it('transfer', async () => {
        let b1 = await suomi.balanceOf(acc1)
        let b2 = await suomi.balanceOf(acc2)

        await suomi.transfer(acc2, 10, { from: acc1 })

        assertEqual(await suomi.balanceOf(acc1), b1.sub(10))
        assertEqual(await suomi.balanceOf(acc2), b2.add(10))

        b1 = await suomi.balanceOf(acc1)
        b2 = await suomi.balanceOf(acc2)

        // transfer amount over blance
        await suomi.transfer(acc2, b1.add(1), { from: acc1 })
        // nothing happened
        assertEqual(await suomi.balanceOf(acc1), b1)
        assertEqual(await suomi.balanceOf(acc2), b2)
    })

})

