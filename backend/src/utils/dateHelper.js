class DateHelper {
  
  // Formata data para padrão brasileiro
  formatDateBR(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Formata data e hora para padrão brasileiro
  formatDateTimeBR(date) {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Retorna apenas a hora no formato HH:MM:SS
  formatTime(date) {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Calcula diferença entre duas datas em horas
  calculateHoursDiff(startDate, endDate) {
    const diff = new Date(endDate) - new Date(startDate);
    return (diff / (1000 * 60 * 60)).toFixed(2);
  }

  // Retorna início do dia
  getStartOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Retorna fim do dia
  getEndOfDay(date = new Date()) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  // Retorna início da semana (segunda-feira)
  getStartOfWeek(date = new Date()) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Retorna fim da semana (domingo)
  getEndOfWeek(date = new Date()) {
    const end = new Date(date);
    const day = end.getDay();
    const diff = end.getDate() + (7 - day);
    end.setDate(diff);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  // Retorna início do mês
  getStartOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  // Retorna fim do mês
  getEndOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Verifica se é dia útil (segunda a sexta)
  isWeekday(date) {
    const day = new Date(date).getDay();
    return day !== 0 && day !== 6;
  }

  // Retorna a data no formato YYYY-MM-DD considerando o fuso de Brasília
  getLocalDate(date = new Date()) {
    // Força o fuso de Brasília (UTC-3)
    return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  }

  // Retorna o objeto Date ajustado para o fuso de Brasília
  getNowInBR() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  }
}

module.exports = new DateHelper();
