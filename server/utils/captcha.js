// SVG 图形验证码生成器
class CaptchaGenerator {
    constructor() {
        this.chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        this.length = 4;
    }

    // 生成随机验证码
    generate(length = 4) {
        let code = '';
        for (let i = 0; i < length; i++) {
            code += this.chars.charAt(Math.floor(Math.random() * this.chars.length));
        }
        return code;
    }

    // 创建 SVG 验证码图像
    createSVG(code) {
        const width = 120;
        const height = 40;
        const fontSize = 24;
        const padding = 10;

        // 生成随机颜色
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
        const bgColor = '#f8f9fa';
        const textColor = colors[Math.floor(Math.random() * colors.length)];
        const lineColor = '#e2e8f0';

        // 添加干扰线
        let lines = '';
        for (let i = 0; i < 3; i++) {
            const x1 = Math.random() * width;
            const y1 = Math.random() * height;
            const x2 = Math.random() * width;
            const y2 = Math.random() * height;
            lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="1" />`;
        }

        // 生成干扰点
        let dots = '';
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 2;
            dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${lineColor}" opacity="0.5"/>`;
        }

        // 生成验证码文本
        let text = '';
        const spacing = width / (code.length + 1);
        for (let i = 0; i < code.length; i++) {
            const x = padding + i * spacing;
            const y = padding + (height - padding * 2 - fontSize) / 2;
            const rotation = (Math.random() - 0.5) * 20;
            text += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${textColor}" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" transform="rotate(${rotation} ${x} ${y})">${code[i]}</text>`;
        }

        return `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="${bgColor}"/>
            ${dots}
            ${lines}
            ${text}
        </svg>`;
    }

    // 生成包含验证码图像的 HTML
    generateHTML(code) {
        const svg = this.createSVG(code);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>验证码</title>
            </head>
            <body style="margin:0;padding:0;background:#f0f0f0;display:flex;align-items:center;justify-content:center;height:100vh;">
                <div style="background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin:0 0 20px 0;text-align:center;color:#333;">验证码</h3>
                    <div style="display:flex;align-items:center;justify-content:center;">
                        <input type="text" value="${code}" readonly style="font-size:24px;padding:10px;border:2px solid #ddd;border-radius:5px;width:150px;text-align:center;" />
                        <img src="${svg}" alt="验证码" style="margin-left:20px;cursor:pointer;" onclick="this.src='${svg}?t='+Date.now()" />
                    </div>
                    <p style="margin-top:20px;text-align:center;color:#666;font-size:14px;">验证码: <strong>${code}</strong></p>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = CaptchaGenerator;
