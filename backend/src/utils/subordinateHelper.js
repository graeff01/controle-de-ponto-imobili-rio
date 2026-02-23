const db = require('../config/database');

/**
 * Retorna os IDs dos subordinados de um gestor.
 * Se o gestor NÃO tem vínculos na tabela manager_subordinates, retorna null (vê tudo).
 * Se tem vínculos, retorna array de UUIDs.
 */
async function getSubordinateIds(managerId) {
  const result = await db.query(
    'SELECT subordinate_id FROM manager_subordinates WHERE manager_id = $1',
    [managerId]
  );

  if (result.rows.length === 0) {
    return null; // Sem restrição - vê todos
  }

  return result.rows.map(r => r.subordinate_id);
}

/**
 * Gera cláusula WHERE para filtrar por subordinados.
 * @param {string} managerId - UUID do gestor logado
 * @param {string} userColumn - nome da coluna de user_id (ex: 'u.id', 'tr.user_id')
 * @param {number} paramStart - número do próximo $param
 * @returns {{ clause: string, params: any[], nextParam: number }}
 */
async function getSubordinateFilter(managerId, userColumn = 'u.id', paramStart = 1) {
  const ids = await getSubordinateIds(managerId);

  if (!ids) {
    return { clause: '', params: [], nextParam: paramStart };
  }

  const placeholders = ids.map((_, i) => `$${paramStart + i}`).join(', ');
  return {
    clause: ` AND ${userColumn} IN (${placeholders})`,
    params: ids,
    nextParam: paramStart + ids.length
  };
}

module.exports = { getSubordinateIds, getSubordinateFilter };
