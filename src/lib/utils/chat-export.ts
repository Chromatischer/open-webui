import fileSaver from 'file-saver';
const { saveAs } = fileSaver;

import { getChatById } from '$lib/apis/chats';
import { createMessagesList } from '$lib/utils';
import { getOutputText } from '$lib/components/chat/Messages/structuredOutput';

const chatAsText = (chat: any): string => {
	const history = chat.chat.history;
	const messages = createMessagesList(history, history.currentId);
	const chatText = messages.reduce((a: string, message: any) => {
		const content = getOutputText(message.output) || message.content || '';
		return `${a}### ${message.role.toUpperCase()}\n${content}\n\n`;
	}, '');
	return chatText.trim();
};

export const downloadChatJSON = async (token: string, chatId: string) => {
	const chat = await getChatById(token, chatId);
	if (!chat) return;
	const blob = new Blob([JSON.stringify([chat])], { type: 'application/json' });
	saveAs(blob, `chat-export-${Date.now()}.json`);
};

export const downloadChatTxt = async (token: string, chatId: string) => {
	const chat = await getChatById(token, chatId);
	if (!chat) return;
	const blob = new Blob([chatAsText(chat)], { type: 'text/plain' });
	saveAs(blob, `chat-${chat.chat.title}.txt`);
};

// Plain text-set PDF only — the stylized (html2canvas) export needs the retired
// stock Messages tree mounted offscreen, which this fork no longer renders.
export const downloadChatPdf = async (token: string, chatId: string) => {
	const chat = await getChatById(token, chatId);
	if (!chat) return;

	const { default: jsPDF } = await import('jspdf');
	const chatText = chatAsText(chat);
	const doc = new jsPDF();

	const left = 15;
	const top = 20;
	const bottom = 20;
	const right = 15;
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const usableWidth = pageWidth - left - right;

	const fontSize = 8;
	doc.setFontSize(fontSize);
	const lineHeight = fontSize * 1;

	let y = top;
	for (const paragraph of chatText.split('\n')) {
		const lines = doc.splitTextToSize(paragraph, usableWidth);
		for (const line of lines) {
			if (y + lineHeight > pageHeight - bottom) {
				doc.addPage();
				y = top;
			}
			doc.text(line, left, y);
			y += lineHeight * 0.5;
		}
		y += lineHeight * 0.1;
	}

	doc.save(`chat-${chat.chat.title}.pdf`);
};
