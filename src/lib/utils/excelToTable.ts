import type { Worksheet } from 'exceljs';

const colLetter = (i: number): string => {
	let s = '';
	let n = i;
	while (n >= 0) {
		s = String.fromCharCode(65 + (n % 26)) + s;
		n = Math.floor(n / 26) - 1;
	}
	return s;
};

const esc = (v: unknown): string => {
	if (v === null || v === undefined || v === '') return '&nbsp;';
	return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

export interface ExcelTableResult {
	html: string;
	rowCount: number;
	colCount: number;
}

export async function excelToTable(worksheet: Worksheet): Promise<ExcelTableResult> {
	const rows: unknown[][] = [];
	let colCount = 0;

	worksheet.eachRow({ includeEmpty: true }, (row) => {
		const rowData: unknown[] = [];
		row.eachCell({ includeEmpty: true }, (cell) => {
			rowData.push(cell.value ?? '');
		});
		if (rowData.length > colCount) colCount = rowData.length;
		rows.push(rowData);
	});

	for (const row of rows) {
		while (row.length < colCount) {
			row.push('');
		}
	}

	if (rows.length === 0) {
		return {
			html: '<table><tbody><tr><td>&nbsp;</td></tr></tbody></table>',
			rowCount: 0,
			colCount: 0
		};
	}

	const rowCount = rows.length;

	const parts: string[] = [];
	parts.push('<table>');

	parts.push('<thead><tr>');
	parts.push('<th class="excel-row-num"></th>');
	for (let c = 0; c < colCount; c++) {
		parts.push(`<th class="excel-col-hdr">${colLetter(c)}</th>`);
	}
	parts.push('</tr></thead>');

	parts.push('<tbody>');
	for (let r = 0; r < rowCount; r++) {
		const row = rows[r];
		parts.push('<tr>');
		parts.push(`<td class="excel-row-num">${r + 1}</td>`);
		for (let c = 0; c < colCount; c++) {
			const val = c < row.length ? row[c] : '';
			const isNum = typeof val === 'number';
			parts.push(`<td${isNum ? ' class="excel-num"' : ''}>${esc(val)}</td>`);
		}
		parts.push('</tr>');
	}
	parts.push('</tbody></table>');

	const DOMPurify = (await import('dompurify')).default;
	return {
		html: DOMPurify.sanitize(parts.join('')),
		rowCount,
		colCount
	};
}
