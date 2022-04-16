class VaultService {
    getJenkinsAuthToken() {
        const tokenString = `jenkins-admin8126:2ce9338fb576f64e4d87ae2a54214062`;
        return Buffer.from(tokenString).toString('base64');
    }
}

module.exports = VaultService;