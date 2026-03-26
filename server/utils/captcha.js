// SVG 图形验证码生成器
class CaptchaGenerator {
    constructor() {
        this.chars = "0123456789";
    }

    generate(length = 4) {
        let code = '';
        for (let i = 0; i < length; i++) {
            code += this.chars.charAt(Math.floor(Math.random() * this.chars.length));
        }
        return code;
    }

    createSVG(code) {
        const width = 120;
        const height = 44;
        const fontSize = 22;

        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
        const bgColor = '#f8f9fa';
        const textColor = colors[Math.floor(Math.random() * colors.length)];

        // 干扰线
        let lines = '';
        for (let i = 0; i < 3; i++) {
            const x1 = Math.random() * width;
            const y1 = Math.random() * height;
            const x2 = Math.random() * width;
            const y2 = Math.random() * height;
            lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e2e8f0" stroke-width="1"/>`;
        }

        // 干扰点
        let dots = '';
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 2;
            dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e2e8f0" opacity="0.5"/>`;
        }

        // 验证码文本 - 居中显示
        let text = '';
        const spacing = width / (code.length + 1);
        const textY = height / 2 + fontSize / 3;
        for (let i = 0; i < code.length; i++) {
            const x = spacing * (i + 1);
            const rotation = (Math.random() - 0.5) * 15;
            text += `<text x="${x}" y="${textY}" font-size="${fontSize}" fill="${textColor}" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" transform="rotate(${rotation} ${x} ${textY})">${code[i]}</text>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="${bgColor}"/>
            ${dots}
            ${lines}
            ${text}
        </svg>`;
    }
}

module.exports = CaptchaGenerator;
