export const TERMS_VERSION = '1.0.0';
export const TERMS_DATE = '01 de Março de 2026';

export default function TermosCompromisso() {
  return (
    <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
      <h2 className="text-center font-bold text-lg text-slate-900">
        TERMO DE COMPROMISSO E RESPONSABILIDADE
      </h2>
      <h3 className="text-center font-semibold text-base text-slate-800">
        REGISTRO ELETRÔNICO DE PONTO
      </h3>
      <p className="text-center text-xs text-slate-500 pb-4 border-b">
        Auxiliadora Predial — Versão {TERMS_VERSION} — Vigência a partir de {TERMS_DATE}
      </p>

      <p className="font-bold text-slate-900 pt-2">CONSIDERANDO:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>A obrigatoriedade do registro de jornada de trabalho nos termos do <strong>Art. 74, §2° da CLT</strong>;</li>
        <li>A adoção pela empresa de sistema de Registro Eletrônico de Ponto por Programa (REP-P), em conformidade com a <strong>Portaria MTP n° 671/2021</strong>;</li>
        <li>A validade jurídica de assinaturas eletrônicas simples entre partes privadas, conforme <strong>Lei n° 14.063/2020</strong> e <strong>Art. 10, §2° da MP 2.200-2/2001</strong>;</li>
        <li>O poder diretivo do empregador (<strong>Art. 2° da CLT</strong>) para estabelecer normas internas de controle de jornada.</li>
      </ul>

      <p className="pt-2">
        Eu, colaborador(a) identificado(a) por minha matrícula funcional neste sistema, <strong>DECLARO</strong> que:
      </p>

      {/* Cláusula 1 */}
      <p className="font-bold text-slate-900 pt-4">1. CIÊNCIA DAS REGRAS DE REGISTRO DE PONTO</p>
      <p>
        1.1. Estou ciente de que o registro de ponto é <strong>pessoal e intransferível</strong>, devendo
        ser realizado exclusivamente por mim, com meus próprios dados e credenciais de acesso.
      </p>
      <p>
        1.2. O registro deverá ser efetuado nos <strong>exatos momentos</strong> de entrada, saída para
        intervalo, retorno do intervalo e saída final, conforme Art. 74, §2° da CLT.
      </p>
      <p>
        1.3. Fico ciente da tolerância legal de <strong>5 (cinco) minutos</strong> para cada marcação de
        ponto e de <strong>10 (dez) minutos</strong> diários no total, conforme Art. 58, §1° da CLT.
        Variações dentro deste limite não serão descontadas nem computadas como horas extras.
      </p>

      {/* Cláusula 2 */}
      <p className="font-bold text-slate-900 pt-4">2. INTERVALO INTRAJORNADA</p>
      <p>
        2.1. Comprometo-me a observar o intervalo intrajornada <strong>mínimo de 1 (uma) hora</strong>,
        conforme Art. 71 da CLT, sendo vedado o retorno antecipado ao trabalho antes do cumprimento
        integral do intervalo.
      </p>
      <p>
        2.2. Estou ciente de que a não concessão ou concessão parcial do intervalo intrajornada implica
        o pagamento de natureza indenizatória nos termos do §4° do Art. 71 da CLT, com redação dada
        pela Lei n° 13.467/2017 (Reforma Trabalhista).
      </p>

      {/* Cláusula 3 */}
      <p className="font-bold text-slate-900 pt-4">3. DESCANSO ENTRE JORNADAS</p>
      <p>
        3.1. Estou ciente de que devo respeitar o período mínimo de <strong>11 (onze) horas
        consecutivas</strong> de descanso entre duas jornadas de trabalho, conforme Art. 66 da CLT.
      </p>

      {/* Cláusula 4 */}
      <p className="font-bold text-slate-900 pt-4">4. HORAS EXTRAORDINÁRIAS E BANCO DE HORAS</p>
      <p>
        4.1. Compreendo que a realização de horas extras somente será válida quando <strong>previamente
        autorizada</strong> pelo gestor imediato, nos termos do Art. 59 da CLT.
      </p>
      <p>
        4.2. Declaro estar ciente e de acordo com o regime de <strong>banco de horas</strong> adotado pela
        empresa, conforme Art. 59, §§2° e 5° da CLT, com compensação dentro do prazo legal.
      </p>

      {/* Cláusula 5 */}
      <p className="font-bold text-slate-900 pt-4">5. PROIBIÇÕES E PENALIDADES</p>
      <p>5.1. <strong>É terminantemente proibido:</strong></p>
      <ul className="list-[lower-alpha] pl-8 space-y-1">
        <li>Registrar ponto em nome de terceiros ou permitir que terceiros registrem em meu nome;</li>
        <li>Adulterar, manipular ou tentar burlar o sistema de registro de ponto;</li>
        <li>Registrar horários falsos ou divergentes da jornada efetivamente trabalhada;</li>
        <li>Deixar de registrar a jornada ou registrá-la de forma incompleta sem justificativa;</li>
        <li>Registrar o ponto e não permanecer no local de trabalho.</li>
      </ul>
      <p className="pt-2">5.2. O descumprimento de qualquer das obrigações acima poderá caracterizar:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Ato de improbidade</strong> (Art. 482, alínea "a" da CLT);</li>
        <li><strong>Incontinência de conduta ou mau procedimento</strong> (Art. 482, alínea "b" da CLT);</li>
        <li><strong>Desídia no desempenho das funções</strong> (Art. 482, alínea "e" da CLT);</li>
        <li><strong>Ato de indisciplina ou insubordinação</strong> (Art. 482, alínea "h" da CLT).</li>
      </ul>
      <p className="pt-2">
        5.3. Tais infrações constituem <strong>falta grave</strong> passível de <strong>demissão por justa
        causa</strong>, independentemente de advertência prévia, nos casos de fraude comprovada, conforme
        jurisprudência consolidada do Tribunal Superior do Trabalho (TST).
      </p>

      {/* Cláusula 6 */}
      <p className="font-bold text-slate-900 pt-4">6. CAPTURA DE IMAGEM E DADOS</p>
      <p>
        6.1. Autorizo a captura de minha imagem fotográfica no momento do registro de ponto, para fins
        exclusivos de autenticação, segurança e conformidade com a Portaria MTP n° 671/2021.
      </p>
      <p>
        6.2. Os dados coletados (foto, data, hora, geolocalização quando aplicável) serão processados
        em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei n° 13.709/2018 — LGPD)</strong>,
        com acesso restrito ao RH e gestores autorizados.
      </p>

      {/* Cláusula 7 */}
      <p className="font-bold text-slate-900 pt-4">7. ESPELHO DE PONTO MENSAL</p>
      <p>
        7.1. Comprometo-me a conferir e assinar eletronicamente meu espelho de ponto mensal até o
        <strong> último dia útil de cada mês</strong>, validando os registros ali constantes.
      </p>
      <p>
        7.2. Eventuais divergências deverão ser comunicadas ao RH/gestor <strong>imediatamente</strong>,
        antes da assinatura do espelho.
      </p>

      {/* Cláusula 8 */}
      <p className="font-bold text-slate-900 pt-4">8. VALIDADE JURÍDICA</p>
      <p>
        8.1. Este termo é assinado eletronicamente nos termos da <strong>Lei n° 14.063/2020</strong>
        {' '}(Assinatura Eletrônica Simples), sendo válido entre as partes conforme <strong>Art. 10,
        §2° da MP 2.200-2/2001</strong>.
      </p>
      <p>
        8.2. A assinatura é coletada em conjunto com: nome completo, matrícula funcional, data/hora,
        endereço IP e identificação do navegador, constituindo prova da manifestação de vontade.
      </p>

      {/* Cláusula 9 */}
      <p className="font-bold text-slate-900 pt-4">9. DISPOSIÇÕES FINAIS</p>
      <p>
        9.1. Este termo tem <strong>validade indeterminada</strong>, permanecendo em vigor enquanto durar
        o vínculo empregatício.
      </p>
      <p>
        9.2. Alterações substanciais neste termo exigirão nova aceitação e assinatura eletrônica.
      </p>
      <p className="font-semibold pt-2">
        9.3. Ao assinar este documento, declaro que <strong>li integralmente</strong> o conteúdo acima,
        {' '}<strong>compreendi</strong> todas as condições e <strong>concordo</strong> com todos os termos
        aqui estabelecidos.
      </p>
    </div>
  );
}
