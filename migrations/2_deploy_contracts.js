var suomi = artifacts.require("./suomi.sol");
var suomisale = artifacts.require("./SUOMISale.sol");

module.exports = function(deployer) {
  deployer.deploy(suomi);
  deployer.deploy(SUOMISale);
};
