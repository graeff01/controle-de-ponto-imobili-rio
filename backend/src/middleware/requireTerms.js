const db = require('../config/database');

const requireTerms = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT terms_accepted_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!result.rows[0].terms_accepted_at) {
      return res.status(403).json({
        error: 'Termo de compromisso pendente',
        code: 'TERMS_NOT_ACCEPTED',
        termsRequired: true
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireTerms;
