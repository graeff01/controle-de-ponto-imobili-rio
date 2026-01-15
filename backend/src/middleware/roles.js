const rolesMiddleware = {
    isAdmin: (req, res, next) => {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                error: 'Acesso negado. Apenas administradores podem realizar esta ação.'
            });
        }
        next();
    },

    isManagerOrAdmin: (req, res, next) => {
        if (req.userRole !== 'admin' && req.userRole !== 'manager') {
            return res.status(403).json({
                error: 'Acesso negado.'
            });
        }
        next();
    }
};

module.exports = rolesMiddleware;
