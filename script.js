/**
 * Markdown编辑器主要功能脚本
 * 包含文件处理、导出功能和实时预览等功能
 */

function downloadHTML() {
    const markdownContent = editor.value.trim();
    
    // 检查内容是否为空
    if (!markdownContent) {
        showToast('没有内容可供导出', 'error');
        return;
    }

    // 创建完整的 HTML 文档结构
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown 导出文档</title>
    <style>
        /* 基础样式 */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f7fa;
        }

        /* 内容容器 */
        .markdown-content {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }

        /* 标题样式 */
        h1 { font-size: 2em; margin: 1.5em 0 1em; }
        h2 { font-size: 1.5em; margin: 1.3em 0 0.8em; }
        h3 { font-size: 1.3em; margin: 1.2em 0 0.7em; }
        h4 { font-size: 1.2em; margin: 1.1em 0 0.6em; }
        h5 { font-size: 1.1em; margin: 1em 0 0.5em; }
        h6 { font-size: 1em; margin: 1em 0 0.5em; }

        /* 段落和列表 */
        p { margin: 1em 0; }
        ul, ol { padding-left: 2em; margin: 1em 0; }
        li { margin: 0.5em 0; }

        /* 代码块 */
        pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: "SF Mono", Monaco, Consolas, monospace;
            font-size: 14px;
            line-height: 1.6;
        }

        code {
            background: rgba(27,31,35,0.05);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
            font-family: "SF Mono", Monaco, Consolas, monospace;
        }

        /* 引用块 */
        blockquote {
            margin: 1em 0;
            padding: 0.5em 1.2em;
            border-left: 4px solid #42b983;
            background-color: #f8f8f8;
            color: #666;
        }

        /* 图片 */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1.5em auto;
            border-radius: 8px;
        }

        /* 表格 */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f6f8fa;
        }

        /* 链接 */
        a {
            color: #42b983;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        /* 分割线 */
        hr {
            border: none;
            border-top: 1px solid #eaecef;
            margin: 2em 0;
        }

        /* Terminal 样式 */
        .terminal-block {
            background: #1e1e2e;
            border-radius: 8px;
            margin: 1.5em 0;
            overflow: hidden;
        }

        .terminal-content {
            padding: 16px;
            color: #cdd6f4;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }
    </style>
</head>
<body>
    <div class="markdown-content">
        ${preview.innerHTML}
    </div>
</body>
</html>`;

    // 下载文件
    downloadFile('document.html', htmlContent, 'text/html');
}

// 下载文件通用函数
function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 下载 Markdown 文件
function downloadMD() {
    const markdownContent = editor.value.trim();
    
    // 检查内容是否为空
    if (!markdownContent) {
        showToast('没有内容可供下载', 'error');
        return;
    }
    
    downloadFile('document.md', markdownContent, 'text/markdown');
}

// 文件选择处理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            editor.value = e.target.result;
            updatePreview();
        };
        reader.readAsText(file);
    }
}

// 显示提示信息
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }, 100);
}

// 添加 PDF 导出功能
function downloadPDF() {
    // 创建打印样式
    const printStyles = `
        <style>
            @media print {
                @page {
                    margin: 1.5cm;
                    size: A4;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    line-height: 1.6;
                    color: #2c3e50;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                }

                /* 标题样式 */
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    page-break-after: avoid;
                    color: #000;
                }

                h1 { font-size: 24pt; }
                h2 { font-size: 20pt; }
                h3 { font-size: 16pt; }

                /* 段落和列表 */
                p, ul, ol {
                    margin-bottom: 1em;
                    page-break-inside: avoid;
                }

                /* 代码块 */
                pre {
                    background-color: #f8f9fa !important;
                    border: 1px solid #e9ecef;
                    padding: 1em;
                    margin: 1em 0;
                    page-break-inside: avoid;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 9pt;
                    color: #000 !important;
                }

                code {
                    font-family: "SF Mono", Monaco, Consolas, monospace;
                    background: #f8f9fa !important;
                    padding: 0.2em 0.4em;
                    font-size: 9pt;
                    color: #000 !important;
                }

                /* 图片 */
                img {
                    max-width: 100%;
                    height: auto;
                    margin: 1em 0;
                    page-break-inside: avoid;
                }

                /* 表格 */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1em 0;
                    page-break-inside: avoid;
                }

                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }

                /* 引用块 */
                blockquote {
                    border-left: 4px solid #ddd;
                    padding: 0.5em 1em;
                    margin: 1em 0;
                    page-break-inside: avoid;
                    background: none !important;
                }

                /* 链接 */
                a {
                    color: #000;
                    text-decoration: underline;
                    word-wrap: break-word;
                }

                /* 分页控制 */
                .page-break {
                    page-break-after: always;
                }

                /* 隐藏不需要打印的元素 */
                .toolbar, .editor-section, .code-block-toolbar {
                    display: none !important;
                }

                /* Terminal 样式优化 */
                .terminal-block {
                    border: 1px solid #ddd;
                    margin: 1em 0;
                    page-break-inside: avoid;
                }

                .terminal-content {
                    color: #000 !important;
                    background: #f8f9fa !important;
                }
            }
        </style>
    `;

    // 创建打印内容
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Markdown Document</title>
            ${printStyles}
        </head>
        <body>
            ${preview.innerHTML}
        </body>
        </html>
    `;

    // 创建打印窗口
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    // 等待图片加载完成
    const images = printWindow.document.getElementsByTagName('img');
    let loadedImages = 0;

    function tryPrint() {
        if (loadedImages === images.length) {
            printWindow.focus();
            
            // 显示打印说明
            showToast('请在打印对话框中选择"另存为 PDF"选项');
            
            // 显示打印对话框
            setTimeout(() => {
                printWindow.print();
                // 打印完成后关闭窗口
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            }, 1000);
        }
    }

    if (images.length === 0) {
        tryPrint();
    } else {
        for (let img of images) {
            if (img.complete) {
                loadedImages++;
            } else {
                img.onload = function() {
                    loadedImages++;
                    tryPrint();
                };
                img.onerror = function() {
                    loadedImages++;
                    tryPrint();
                };
            }
        }
    }
}