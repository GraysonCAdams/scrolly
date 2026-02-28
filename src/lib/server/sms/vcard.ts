export function generateVCard(name: string, phoneNumber: string): string {
	return [
		'BEGIN:VCARD',
		'VERSION:3.0',
		`FN:${name}`,
		`TEL;TYPE=CELL:${phoneNumber}`,
		'NOTE:Text video links to this number to share with your group',
		'END:VCARD'
	].join('\r\n');
}
