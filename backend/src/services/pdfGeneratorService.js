const PdfPrinter = require('pdfmake/js/Printer').default;
const path = require('path');

const fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
        bold: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

const meses = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

class PdfGeneratorService {

    async generateTimeMirror(userData, reportData, signatureData = null) {
        const { user, period } = userData;
        const { resumo, detalhes } = reportData;
        const mesNome = meses[parseInt(period.month)] || period.month;

        // Gerar linhas dos dias, com listras zebra
        const tableBody = [
            [
                { text: 'DATA', style: 'tableHeader' },
                { text: 'DIA', style: 'tableHeader' },
                { text: 'ENTRADA', style: 'tableHeader' },
                { text: 'S. INT.', style: 'tableHeader' },
                { text: 'R. INT.', style: 'tableHeader' },
                { text: 'SAIDA', style: 'tableHeader' },
                { text: 'TOTAL', style: 'tableHeader' },
                { text: 'STATUS', style: 'tableHeader' }
            ]
        ];

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

        detalhes.forEach((dia, idx) => {
            const dataObj = new Date(dia.date + 'T12:00:00');
            const diaSemana = diasSemana[dataObj.getDay()];
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const isFimDeSemana = dataObj.getDay() === 0 || dataObj.getDay() === 6;
            const fillColor = isFimDeSemana ? '#f0f0f0' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');

            const statusColor = dia.status_dia === 'Completo' ? '#16a34a' : (dia.status_dia === 'Incompleto' ? '#ea580c' : '#94a3b8');

            tableBody.push([
                { text: dataFormatada, fillColor, fontSize: 8 },
                { text: diaSemana, fillColor, fontSize: 8, bold: isFimDeSemana },
                { text: dia.entrada || '--:--', fillColor, fontSize: 8 },
                { text: dia.saida_intervalo || '--:--', fillColor, fontSize: 8 },
                { text: dia.retorno_intervalo || '--:--', fillColor, fontSize: 8 },
                { text: dia.saida_final || '--:--', fillColor, fontSize: 8 },
                { text: `${dia.hours_worked}h`, fillColor, fontSize: 8, alignment: 'right' },
                { text: dia.status_dia, fillColor, fontSize: 7, color: statusColor, bold: true }
            ]);
        });

        const saldoNum = parseFloat(resumo.saldo || 0);
        const saldoTexto = saldoNum >= 0 ? `+${saldoNum.toFixed(2)}h` : `${saldoNum.toFixed(2)}h`;
        const saldoCor = saldoNum >= 0 ? '#16a34a' : '#dc2626';

        const content = [
            // Cabeçalho
            {
                columns: [
                    {
                        stack: [
                            { text: 'ESPELHO DE PONTO', style: 'header' },
                            { text: `${mesNome} / ${period.year}`, style: 'subheader' }
                        ]
                    },
                    {
                        stack: [
                            { text: 'IMOBILIARIA JARDIM DO LAGO', alignment: 'right', style: 'companyName' },
                            { text: `Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, alignment: 'right', fontSize: 8, color: '#94a3b8' }
                        ]
                    }
                ]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1.5, lineColor: '#1e293b' }] },
            { text: '', margin: [0, 8] },

            // Dados do Funcionario
            {
                table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            { text: [{ text: 'Funcionario: ', bold: true }, user.nome] },
                            { text: [{ text: 'Matricula: ', bold: true }, user.matricula] }
                        ],
                        [
                            { text: [{ text: 'Cargo: ', bold: true }, user.cargo || 'Nao informado'] },
                            { text: [{ text: 'Situacao: ', bold: true }, (user.status || '').toUpperCase()] }
                        ]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },

            // Tabela de Registros
            {
                table: {
                    headerRows: 1,
                    widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
                    body: tableBody
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 3,
                    paddingBottom: () => 3
                }
            },

            { text: '', margin: [0, 15] },

            // Resumo do Mes
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: 'RESUMO DO MES', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
                            {
                                table: {
                                    widths: ['*', 'auto'],
                                    body: [
                                        [{ text: 'Total de Horas Trabalhadas:', bold: true }, { text: `${resumo.total_horas}h`, alignment: 'right' }],
                                        [{ text: 'Horas Esperadas:', bold: true }, { text: `${resumo.horas_esperadas || '0.00'}h`, alignment: 'right' }],
                                        [{ text: 'Saldo:', bold: true }, { text: saldoTexto, alignment: 'right', color: saldoCor, bold: true }],
                                        [{ text: 'Dias Completos:', bold: true }, { text: `${resumo.dias_completos}`, alignment: 'right' }],
                                        [{ text: 'Dias Incompletos:', bold: true }, { text: `${resumo.dias_incompletos}`, alignment: 'right', color: resumo.dias_incompletos > 0 ? '#ea580c' : '#000' }]
                                    ]
                                },
                                layout: 'lightHorizontalLines'
                            }
                        ]
                    },
                    { width: 20, text: '' }
                ]
            },

            { text: '', margin: [0, 30] },

            // Area de Assinatura
            {
                stack: [
                    { text: 'DECLARACAO DE CONFORMIDADE', style: 'signatureTitle' },
                    {
                        text: 'Declaro que as informacoes constantes neste espelho de ponto sao veridicas e refletem fielmente a jornada de trabalho realizada no periodo acima mencionado, em total conformidade com a Portaria 671/MTE.',
                        style: 'signatureText'
                    },
                    { text: '', margin: [0, 25] },
                    {
                        columns: [
                            {
                                width: '*',
                                stack: [
                                    ...(signatureData && signatureData.image ? [
                                        { image: signatureData.image, width: 150, height: 60, alignment: 'center' }
                                    ] : []),
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                                    { text: user.nome, margin: [0, 5], alignment: 'center', fontSize: 9 },
                                    { text: 'Assinatura do Funcionario', fontSize: 7, color: '#888', alignment: 'center' }
                                ],
                                alignment: 'center'
                            },
                            { width: 40, text: '' },
                            {
                                width: '*',
                                stack: [
                                    { text: '', margin: [0, signatureData && signatureData.image ? 60 : 0] },
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                                    { text: 'IMOBILIARIA JARDIM DO LAGO', margin: [0, 5], alignment: 'center', fontSize: 9 },
                                    { text: 'Assinatura da Empresa', fontSize: 7, color: '#888', alignment: 'center' }
                                ],
                                alignment: 'center'
                            }
                        ]
                    }
                ]
            }
        ];

        // Rodape com hash se assinado eletronicamente
        if (signatureData) {
            content.push({
                stack: [
                    { text: '', margin: [0, 15] },
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e2e8f0' }] },
                    { text: 'ASSINATURA ELETRONICA', bold: true, fontSize: 8, margin: [0, 8, 0, 2] },
                    { text: `Hash: ${signatureData.hash}`, fontSize: 7, color: '#666' },
                    { text: `Assinado em: ${new Date(signatureData.date).toLocaleString('pt-BR')}`, fontSize: 7, color: '#666' },
                    { text: `IP: ${signatureData.ip}`, fontSize: 7, color: '#666' }
                ]
            });
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 40, 30, 40],
            content,
            styles: {
                header: { fontSize: 16, bold: true, color: '#1e293b' },
                subheader: { fontSize: 11, color: '#64748b', margin: [0, 3, 0, 0] },
                companyName: { fontSize: 11, bold: true, color: '#1e293b' },
                tableHeader: { bold: true, fontSize: 8, color: '#ffffff', fillColor: '#1e293b', margin: [0, 4] },
                signatureTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 8], alignment: 'center' },
                signatureText: { fontSize: 8, color: '#4a5568', alignment: 'justify' }
            },
            defaultStyle: {
                fontSize: 9,
                font: 'Roboto'
            },
            footer: (currentPage, pageCount) => ({
                columns: [
                    { text: 'Documento gerado pelo Sistema de Ponto - Jardim do Lago', fontSize: 7, color: '#94a3b8', margin: [30, 0] },
                    { text: `Pagina ${currentPage} de ${pageCount}`, fontSize: 7, color: '#94a3b8', alignment: 'right', margin: [0, 0, 30, 0] }
                ]
            })
        };

        return printer.createPdfKitDocument(docDefinition);
    }
}

module.exports = new PdfGeneratorService();
