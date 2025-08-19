const toolsObj = {};

toolsObj.saveFlash = function(req, res) {
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
};

toolsObj.createAuthToken = ()=>{

    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let token = '';
        for (let i = 0; i < 25; i++) {
            token += characters[Math.floor(Math.random() * characters.length )];
        }

        return token;
}

module.exports = toolsObj;