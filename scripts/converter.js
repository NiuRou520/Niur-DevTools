// 全局变量
const MAX_FILES = 20;
let currentFiles = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewList = document.getElementById('previewList');
    const startConvertBtn = document.getElementById('startConvert');
    const downloadAllBtn = document.getElementById('downloadAll');
    const clearAllBtn = document.getElementById('clearAll');
    const targetFormat = document.getElementById('targetFormat');

    // 检查必要的DOM元素是否存在
    if (!dropZone || !fileInput || !previewList || !startConvertBtn || 
        !downloadAllBtn || !clearAllBtn || !targetFormat) {
        console.error('必要的DOM元素未找到');
        return;
    }

    // 文件选择处理
    fileInput.addEventListener('change', handleFiles);

    // 拖放处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFiles({ target: { files } });
    });

    // 清空按钮点击事件
    clearAllBtn.addEventListener('click', () => {
        currentFiles = [];
        previewList.innerHTML = '';
        fileInput.value = '';
        startConvertBtn.style.display = 'none';
        downloadAllBtn.style.display = 'none';
    });

    // 开始转换按钮事件
    startConvertBtn.addEventListener('click', async () => {
        if (currentFiles.length === 0) {
            showToast('请先选择文件', 'error');
            return;
        }

        try {
            startConvertBtn.disabled = true;
            startConvertBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 转换中...';

            if (targetFormat.value === 'pdf') {
                // PDF 合并处理
                await handlePDFConversion(currentFiles);
            } else {
                // 常规格式转换
                const items = document.querySelectorAll('.preview-item');
                let successCount = 0;

                for (let i = 0; i < currentFiles.length; i++) {
                    const success = await convertFile(currentFiles[i], items[i]);
                    if (success) successCount++;
                }

                if (successCount > 0) {
                    showToast(`成功转换 ${successCount} 个文件`);
                    downloadAllBtn.style.display = 'block';
                } else {
                    showToast('没有文件转换成功', 'error');
                }
            }
        } catch (error) {
            console.error('转换失败:', error);
            showToast('转换过程出错: ' + (error.message || '未知错误'), 'error');
        } finally {
            startConvertBtn.disabled = false;
            startConvertBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> 开始转换';
        }
    });

    // 批量下载按钮事件
    downloadAllBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('.preview-item');
        items.forEach(item => {
            const downloadBtn = item.querySelector('.download-btn');
            if (downloadBtn && downloadBtn.style.display !== 'none') {
                downloadBtn.click();
            }
        });
    });

    // 格式选择器变化事件
    targetFormat.addEventListener('change', function() {
        if (currentFiles.length > 0) {
            startConvertBtn.style.display = 'block';
        }
    });

    // 确预览样式已添加
    ensurePreviewStyles();
});

// 修改错误处理
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
    if (e.error) {
        showToast('发生错误: ' + (e.error.message || '未知错误'), 'error');
    }
});

// 处理文件选择
async function handleFiles(event) {
    const files = Array.from(event.target.files).filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        return validTypes.includes(file.type);
    });
    
    if (files.length === 0) {
        showToast('请选择有效的文件格式', 'error');
        return;
    }

    if (files.length > MAX_FILES) {
        showToast(`最多只能选择 ${MAX_FILES} 个文件`, 'error');
        return;
    }

    currentFiles = files;
    const previewList = document.getElementById('previewList');
    const startConvertBtn = document.getElementById('startConvert');
    
    if (!previewList || !startConvertBtn) {
        console.error('必要的DOM元素未找到');
        return;
    }

    previewList.innerHTML = ''; // 清空列表

    // 创建预览
    for (const file of files) {
        const previewItem = createPreviewItem(file);
        previewList.appendChild(previewItem);
        await showPreview(file, previewItem);
    }

    // 显示转换按钮
    startConvertBtn.style.display = 'block';
}

// 添加合并为PDF的功能
async function mergeImagesToPDF() {
    try {
        showToast('正在合并为PDF...', 'info');
        
        // 创建新的 jsPDF 实例
        const pdf = new jsPDF();
        let isFirstPage = true;

        for (const file of currentFiles) {
            if (!file.type.startsWith('image/')) {
                continue;
            }

            const img = await createImageFromFile(file);
            
            // 计算图片在 PDF 中的尺寸
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

            // 如果不是第一页，添加新页
            if (!isFirstPage) {
                pdf.addPage();
            }

            // 添加图片到 PDF
            pdf.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight);
            isFirstPage = false;
        }

        // 保存 PDF
        pdf.save('merged_images.pdf');
        showToast('PDF 合并完成！', 'success');

    } catch (error) {
        console.error('PDF 合并失败:', error);
        showToast('PDF 合并失败: ' + error.message, 'error');
    }
}

// 修改 createPreviewItem 函数
function createPreviewItem(file) {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
        <div class="preview-content">
            <div class="preview-original">
                <div class="preview-header">
                    <span class="preview-title">原始文件</span>
                    <button class="remove-btn" onclick="removeItem(this)">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="preview-wrapper">
                    <!-- 预览图片将在 showPreview 函数中动态添加 -->
                </div>
                <div class="file-info">
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-type">${file.type.split('/')[1].toUpperCase()}</span>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    </div>
                </div>
            </div>
            <div class="preview-converted">
                <div class="preview-header">
                    <span class="preview-title">转换预览</span>
                    <span class="convert-status">等待转换...</span>
                </div>
                <div class="preview-wrapper preview-converted-wrapper">
                    <div class="preview-placeholder">
                        <i class="bi bi-arrow-repeat"></i>
                        <span>等待转换...</span>
                    </div>
                </div>
                <div class="file-info">
                    <div class="convert-actions">
                        <button class="download-btn" style="display: none;">
                            <i class="bi bi-download"></i> 下载
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return item;
}

// 移除单个预览项
function removeItem(button) {
    const item = button.closest('.preview-item');
    const index = Array.from(item.parentNode.children).indexOf(item);
    currentFiles = currentFiles.filter((_, i) => i !== index);
    item.remove();

    if (currentFiles.length === 0) {
        document.getElementById('startConvert').style.display = 'none';
        document.getElementById('downloadAll').style.display = 'none';
    }
}

// 显示预览
async function showPreview(file, previewItem) {
    try {
        const previewWrapper = previewItem.querySelector('.preview-original .preview-wrapper');
        if (!previewWrapper) {
            throw new Error('预览容器不存在');
        }

        // 显示加载状态
        previewWrapper.innerHTML = `
            <div class="loading-indicator">
                <i class="bi bi-arrow-repeat spin"></i>
                <span>加载中...</span>
            </div>
        `;

        // 根据文件类型处理预览
        if (file.type.startsWith('image/')) {
            // 处理图片文件
            const img = await createImageFromFile(file);
            
            // 创建预览 canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置预览尺寸
            const maxPreviewSize = 300;
            const scale = Math.min(maxPreviewSize / img.naturalWidth, maxPreviewSize / img.naturalHeight);
            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;
            
            // 绘制预览
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 显示预览
            previewWrapper.innerHTML = '';
            previewWrapper.appendChild(canvas);
            
        } else if (file.type === 'application/pdf') {
            // 处理 PDF 文件
            await handlePDFPreview(file, previewWrapper);
        } else {
            throw new Error('不支持的文件类型：' + file.type);
        }

    } catch (error) {
        console.error('预览失败:', error);
        previewWrapper.innerHTML = `
            <div class="error-message">
                <i class="bi bi-exclamation-triangle"></i>
                <p>预览失败: ${error.message}</p>
            </div>
        `;
        showToast('文件预览失败: ' + error.message, 'error');
    }
}

// 添加图片预览处理函数
async function handleImagePreview(file, previewWrapper) {
    // 使 Promise 包装文件读取过程
    const reader = new FileReader();
    const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
            if (!e.target.result || typeof e.target.result !== 'string') {
                reject(new Error('文件读取结果无效'));
                return;
            }
            resolve(e.target.result);
        };
        reader.onerror = (error) => {
            console.error('文件读取错误:', error);
            reject(new Error('文件读取失'));
        };
        reader.readAsDataURL(file);
    });

    // 创建新的图片元素并加载
    const newImg = new Image();
    
    await new Promise((resolve, reject) => {
        let timeoutId = setTimeout(() => {
            reject(new Error('图片加载超时'));
        }, 10000);

        newImg.onload = () => {
            clearTimeout(timeoutId);
            
            // 验证图片尺寸
            if (newImg.naturalWidth === 0 || newImg.naturalHeight === 0) {
                reject(new Error('加载的图片尺寸无效'));
                return;
            }

            // 设置图片样式
            newImg.className = 'preview-image original';
            newImg.style.maxHeight = '300px';
            newImg.style.maxWidth = '100%';
            newImg.style.objectFit = 'contain';
            newImg.style.display = 'block';
            
            // 清除加载指示器并添加图片
            previewWrapper.innerHTML = '';
            previewWrapper.appendChild(newImg);
            
            resolve();
        };
        
        newImg.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error('图片加载失败'));
        };

        newImg.src = imageDataUrl;
    });
}

// 添加 PDF 预览处理函数
async function handlePDFPreview(file, previewWrapper) {
    try {
        const reader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('PDF 文件读取失败'));
            reader.readAsArrayBuffer(file);
        });

        // 加载 PDF.js
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

        // 加载 PDF 文档
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // 获取第一页
        const page = await pdf.getPage(1);
        
        // 创 canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 设置合适的缩放比例
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = Math.min(300 / viewport.height, 1.0);
        const scaledViewport = page.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        canvas.style.maxHeight = '300px';
        canvas.style.width = 'auto';

        // 渲染 PDF 页面
        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        // 显示预览
        previewWrapper.innerHTML = '';
        previewWrapper.appendChild(canvas);

    } catch (error) {
        console.error('PDF 预览失败:', error);
        throw new Error('PDF 预览失败: ' + error.message);
    }
}

// 工具函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

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

// 修改 handlePDFConversion 函数
async function handlePDFConversion(files) {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF 库未正确加载');
        }

        showToast('正在生成PDF...', 'info');
        
        // 创建新的 jsPDF 实例，使用图片的尺寸比例来决定页面方向
        const { jsPDF } = window.jspdf;
        let isFirstPage = true;
        let pdf;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                continue;
            }

            try {
                const img = await createImageFromFile(file);
                
                // 根据第一张图片的尺寸决定 PDF 的尺寸和方向
                if (isFirstPage) {
                    // 确定页面方向
                    const orientation = img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait';
                    pdf = new jsPDF({
                        orientation: orientation,
                        unit: 'px',
                        format: [img.naturalWidth, img.naturalHeight]
                    });
                } else {
                    pdf.addPage([img.naturalWidth, img.naturalHeight], img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait');
                }

                // 添加图片到 PDF，使用完整页面大小
                pdf.addImage(
                    img, 
                    'PNG', 
                    0,  // x 坐标
                    0,  // y 坐标
                    img.naturalWidth,  // 宽度
                    img.naturalHeight  // 高度
                );
                
                isFirstPage = false;

            } catch (error) {
                console.error(`处理图片 ${file.name} 时出错:`, error);
                showToast(`处理 ${file.name} 失败: ${error.message}`, 'error');
            }
        }

        // 检查是否有成功添加的页面
        if (isFirstPage) {
            throw new Error('没有可用的图片文件可以转换');
        }

        // 获取 PDF blob
        const pdfBlob = await pdf.output('blob');
        
        // 更新所有预览项的转换结果
        const previewItems = document.querySelectorAll('.preview-item');
        previewItems.forEach(async (previewItem) => {
            const previewPlaceholder = previewItem.querySelector('.preview-converted .preview-wrapper');
            const downloadBtn = previewItem.querySelector('.download-btn');
            const status = previewItem.querySelector('.convert-status');
            
            if (previewPlaceholder && downloadBtn && status) {
                // 创建预览（使用第一页）
                try {
                    // 使用 PDF.js 创建预览
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    const pdf = await pdfjsLib.getDocument({ data: await pdfBlob.arrayBuffer() }).promise;
                    const page = await pdf.getPage(1);
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    // 设置预览尺寸
                    const viewport = page.getViewport({ scale: 1.0 });
                    const scale = Math.min(300 / viewport.height, 1.0);
                    const scaledViewport = page.getViewport({ scale });

                    canvas.height = scaledViewport.height;
                    canvas.width = scaledViewport.width;

                    // 渲染预览
                    await page.render({
                        canvasContext: context,
                        viewport: scaledViewport
                    }).promise;

                    // 更新预览
                    previewPlaceholder.innerHTML = '';
                    previewPlaceholder.appendChild(canvas);

                    // 添加预览信息
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'preview-info';
                    infoDiv.innerHTML = `
                        <div class="info-item">
                            <i class="bi bi-file-earmark-pdf"></i>
                            格式: PDF
                        </div>
                        <div class="info-item">
                            <i class="bi bi-files"></i>
                            页数: ${pdf.numPages}
                        </div>
                    `;
                    previewPlaceholder.appendChild(infoDiv);

                    // 设置下载按钮
                    const url = URL.createObjectURL(pdfBlob);
                    downloadBtn.onclick = () => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'converted_images.pdf';
                        a.click();
                        URL.revokeObjectURL(url);
                    };
                    downloadBtn.style.display = 'block';
                    
                    status.textContent = '转换成功';
                } catch (error) {
                    console.error('预览生成失败:', error);
                    previewPlaceholder.innerHTML = `
                        <div class="error-message">
                            <i class="bi bi-exclamation-triangle"></i>
                            <p>预览生成失败，但PDF已经准备就绪</p>
                        </div>
                    `;
                }
            }
        });

        showToast('PDF 生成完成！', 'success');
        return true;

    } catch (error) {
        console.error('PDF 生成失败:', error);
        showToast('PDF 生成失败: ' + error.message, 'error');
        return false;
    }
}

// 修改 convertFile 函数中的图片转换部分
async function convertFile(file, previewItem) {
    const targetFormat = document.getElementById('targetFormat').value;
    const status = previewItem.querySelector('.convert-status');
    const previewPlaceholder = previewItem.querySelector('.preview-converted .preview-wrapper');
    const downloadBtn = previewItem.querySelector('.download-btn');

    try {
        if (!status || !previewPlaceholder || !downloadBtn) {
            throw new Error('预览元素未找到');
        }

        status.textContent = '转换中...';
        previewPlaceholder.innerHTML = `
            <div class="loading-indicator">
                <i class="bi bi-arrow-repeat spin"></i>
                <span>转换中...</span>
            </div>
        `;

        if (file.type === 'application/pdf' && targetFormat !== 'pdf') {
            // PDF 转图片 - 处理多页
            const canvases = await convertPDFToImage(file, targetFormat);
            
            // 创建 ZIP 文件来保存所有图片
            const zip = new JSZip();
            
            // 添加每一页到 ZIP
            for (let i = 0; i < canvases.length; i++) {
                const canvas = canvases[i];
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, `image/${targetFormat}`, 0.92);
                });
                zip.file(`page_${i + 1}.${targetFormat}`, blob);
            }
            
            // 生成 ZIP 文件
            const zipBlob = await zip.generateAsync({type: 'blob'});
            
            // 更新预览（显示第一页）
            await updatePreview(canvases[0], previewPlaceholder, downloadBtn, targetFormat, file.name);
            
            // 修改下载按钮行为
            const url = URL.createObjectURL(zipBlob);
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = `${file.name.replace('.pdf', '')}_all_pages.zip`;
                a.click();
                URL.revokeObjectURL(url);
            };
            
            // 添加页数信息
            const infoDiv = document.createElement('div');
            infoDiv.className = 'preview-info';
            infoDiv.innerHTML = `
                <div class="info-item">
                    <i class="bi bi-file-earmark"></i>
                    格式: ${targetFormat.toUpperCase()}
                </div>
                <div class="info-item">
                    <i class="bi bi-files"></i>
                    总页数: ${canvases.length}
                </div>
            `;
            previewPlaceholder.appendChild(infoDiv);
            
        } else if (file.type.startsWith('image/')) {
            // 图片转换
            const img = await createImageFromFile(file);
            
            // 创建 canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置 canvas 尺寸
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // 绘制图片
            ctx.drawImage(img, 0, 0);
            
            // 更新预览
            await updatePreview(canvas, previewPlaceholder, downloadBtn, targetFormat, file.name);
        } else {
            throw new Error('不支持的文件类型');
        }

        status.textContent = '转换成功';
        return true;

    } catch (error) {
        console.error('转换失败:', error);
        status.textContent = '转换失败';
        previewPlaceholder.innerHTML = `
            <div class="error-message">
                <i class="bi bi-exclamation-triangle"></i>
                <div>转换失败: ${error.message}</div>
                <div class="file-info">
                    文件信息：${file.name} (${file.type}, ${formatFileSize(file.size)})
                </div>
            </div>
        `;
        showToast('文件转换失败: ' + error.message, 'error');
        return false;
    }
}

// 修改 convertPDFToImage 函数以支持多页转换
async function convertPDFToImage(file, targetFormat) {
    try {
        // 读取 PDF 文件
        const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('PDF 文件读取失败'));
            reader.readAsArrayBuffer(file);
        });

        // 加载 PDF.js
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        
        // 加载 PDF 文档
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        // 创建一个数组来存储所有页面的 canvas
        const canvases = [];
        
        // 处理每一页
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            // 获取页面
            const page = await pdf.getPage(pageNum);
            
            // 创建 canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // 设置更高的缩放比例以获得更好的质量
            const viewport = page.getViewport({ scale: 2.0 });
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // 渲染 PDF 页面到 canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            canvases.push(canvas);
        }

        return canvases;

    } catch (error) {
        console.error('PDF 转换失败:', error);
        throw new Error('PDF 转换失败: ' + error.message);
    }
}

// 删除重复的 convertImage 函数，只保留 createImageFromFile 函数
function createImageFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('未提供文件'));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            if (!e.target || !e.target.result) {
                reject(new Error('文件读取失败'));
                return;
            }

            const img = new Image();
            
            img.onload = () => {
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    reject(new Error('无效的图片尺寸'));
                    return;
                }
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };

            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

// 添加格式选择器变化事件
document.getElementById('targetFormat').addEventListener('change', function() {
    const currentFormat = this.value;
    const startConvertBtn = document.getElementById('startConvert');
    
    if (currentFiles.length > 0) {
        startConvertBtn.style.display = 'block';
    }
});

// 添加错误处理和日志
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
    showToast('发生错误: ' + e.error.message, 'error');
});

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

// 修改加载和预览相关代码
function previewOriginalImage(file) {
    const reader = new FileReader();
    const preview = document.getElementById('originalPreview');
    
    reader.onload = function(e) {
        // 创建新的 Image 对象
        const img = new Image();
        img.onload = function() {
            // 成功加载后设置预览
            preview.src = img.src;
            preview.style.display = 'block';
            
            // 更新原始图片信息
            updateImageInfo(file, img, 'original');
        };
        
        img.onerror = function() {
            console.error('原图预览载失败');
            preview.style.display = 'none';
            showError('原图预览加载失败，请检查文件是否损坏');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = function() {
        console.error('文件读取失败');
        showError('文件读取失败，请重试');
    };
    
    reader.readAsDataURL(file);
}

// 修改转换相关代码
async function convertImage(file, format) {
    try {
        // 创建加载提示
        showLoading('正在转换图片...');
        
        // 使用 Promise 包装图片加载过程
        const loadImage = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('图片加载失败，请检查文件格式是否正确'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsDataURL(file);
            });
        };

        // 加载图片
        const img = await loadImage(file);
        
        // 创建 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置 canvas 尺寸
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 根据不同格式进行转换
        let convertedDataUrl;
        let mimeType;
        
        switch(format.toLowerCase()) {
            case 'png':
                mimeType = 'image/png';
                convertedDataUrl = canvas.toDataURL('image/png');
                break;
            case 'jpeg':
            case 'jpg':
                mimeType = 'image/jpeg';
                convertedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                break;
            case 'webp':
                mimeType = 'image/webp';
                convertedDataUrl = canvas.toDataURL('image/webp', 0.92);
                break;
            default:
                throw new Error('不支持的格式');
        }
        
        // 预览转换后的图片
        const convertedPreview = document.getElementById('convertedPreview');
        convertedPreview.src = convertedDataUrl;
        convertedPreview.style.display = 'block';
        
        // 创建转换后的文件
        const convertedFile = dataURLtoFile(
            convertedDataUrl,
            `converted.${format.toLowerCase()}`
        );
        
        // 更新转换后图片信息
        updateImageInfo(convertedFile, img, 'converted');
        
        hideLoading();
        showSuccess('转换成功！');
        
        return convertedFile;
        
    } catch (error) {
        hideLoading();
        console.error('转换失败:', error);
        showError(`转换失败: ${error.message}`);
        throw error;
    }
}

// 辅助函数：显示错误信息
function showError(message) {
    const errorDiv = document.getElementById('errorMessage') || createErrorElement();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// 辅助函数：创建错误提示元素
function createErrorElement() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorMessage';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 1000;
        display: none;
    `;
    document.body.appendChild(errorDiv);
    return errorDiv;
}

// 辅助函数：显示加载中
function showLoading(message) {
    const loadingDiv = document.getElementById('loadingMessage') || createLoadingElement();
    loadingDiv.textContent = message;
    loadingDiv.style.display = 'flex';
}

// 辅助函数：隐藏加载
function hideLoading() {
    const loadingDiv = document.getElementById('loadingMessage');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

// 辅助函数：创建加载提示元素
function createLoadingElement() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingMessage';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
}

// 辅助函数：显示成功信息
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage') || createSuccessElement();
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 2000);
}

// 辅助函数：创建成功提示元素
function createSuccessElement() {
    const successDiv = document.createElement('div');
    successDiv.id = 'successMessage';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00C851;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 1000;
        display: none;
    `;
    document.body.appendChild(successDiv);
    return successDiv;
}

// 添加样式检查和修复函数
function ensurePreviewStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* 容器样式 */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .converter-container {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        /* 上传区域样式 */
        .upload-area {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 2px dashed rgba(0, 0, 0, 0.1);
            border-radius: 16px;
            padding: 3rem 2rem;
            text-align: center;
            transition: all 0.3s ease;
            margin-bottom: 2rem;
        }

        .upload-area:hover {
            background: rgba(255, 255, 255, 0.6);
            border-color: rgba(0, 122, 255, 0.3);
        }

        .upload-area.drag-over {
            background: rgba(0, 122, 255, 0.1);
            border-color: rgba(0, 122, 255, 0.5);
        }

        .upload-area i {
            font-size: 3rem;
            color: #007AFF;
            margin-bottom: 1rem;
        }

        .upload-area h3 {
            font-size: 1.5rem;
            color: #1d1d1f;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }

        .upload-area p {
            color: #86868b;
            margin: 0.5rem 0;
        }

        /* 按钮样式 */
        .upload-area button {
            background: rgba(0, 122, 255, 0.9);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 20px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1rem;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .upload-area button:hover {
            background: rgba(0, 122, 255, 1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
        }

        /* 上传提示样式 */
        .upload-tips {
            margin-top: 1.5rem;
            color: #86868b;
            font-size: 0.9rem;
        }

        /* 设置面板样式 */
        .settings-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 1.5rem;
            margin: 2rem 0;
        }

        .settings-panel h3 {
            color: #1d1d1f;
            font-size: 1.2rem;
            margin-bottom: 1rem;
            font-weight: 500;
        }

        /* 格式选择器样式 */
        .format-select {
            background: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            padding: 10px 16px;
            font-size: 1rem;
            color: #1d1d1f;
            width: 100%;
            max-width: 200px;
            cursor: pointer;
            transition: all 0.3s ease;
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23000000' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
        }

        .format-select:hover {
            border-color: rgba(0, 122, 255, 0.5);
            background-color: rgba(255, 255, 255, 0.9);
        }

        .format-select:focus {
            outline: none;
            border-color: #007AFF;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        /* 转换按钮样式 */
        .convert-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
        }

        .primary-btn, .secondary-btn, .clear-btn {
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            border: none;
        }

        .primary-btn {
            background: #007AFF;
            color: white;
        }

        .primary-btn:hover {
            background: #0066CC;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
        }

        .secondary-btn {
            background: rgba(0, 122, 255, 0.1);
            color: #007AFF;
        }

        .secondary-btn:hover {
            background: rgba(0, 122, 255, 0.2);
            transform: translateY(-2px);
        }

        .clear-btn {
            background: rgba(255, 59, 48, 0.1);
            color: #FF3B30;
        }

        .clear-btn:hover {
            background: rgba(255, 59, 48, 0.2);
            transform: translateY(-2px);
        }

        /* 预览列表样式保持不变 */
        .preview-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
        }

        .preview-item {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            height: fit-content;
        }

        .preview-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .preview-original,
        .preview-converted {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        }

        .preview-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .preview-title {
            font-weight: 600;
            color: #333;
            font-size: 1rem;
        }

        .preview-wrapper {
            width: 100%;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.03);
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            margin: 10px 0;
        }

        .preview-wrapper canvas,
        .preview-wrapper img {
            max-width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 4px;
        }

        .preview-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            color: #666;
            padding: 20px;
            text-align: center;
        }

        .preview-placeholder i {
            font-size: 24px;
            color: #999;
        }

        .file-info {
            margin-top: 10px;
            font-size: 0.9em;
            color: #666;
            padding: 10px;
            background: rgba(0, 0, 0, 0.02);
            border-radius: 6px;
        }

        .file-details {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }

        .convert-status {
            font-size: 0.9em;
            color: #666;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
        }

        .download-btn {
            background: #007AFF;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            width: fit-content;
        }

        .download-btn:hover {
            background: #0056b3;
            transform: translateY(-1px);
        }

        .preview-info {
            width: 100%;
            margin-top: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.03);
            border-radius: 6px;
            font-size: 0.9em;
            color: #666;
        }

        .info-item {
            margin: 6px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .remove-btn {
            background: none;
            border: none;
            color: #ff3b30;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .remove-btn:hover {
            background: rgba(255, 59, 48, 0.1);
        }

        .loading-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            color: #666;
        }

        .loading-indicator i {
            font-size: 24px;
        }

        .spin {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .preview-list {
                grid-template-columns: 1fr;
                padding: 10px;
            }

            .preview-item {
                padding: 15px;
            }
        }
    `;
    document.head.appendChild(style);
}

// 添加更新预览的辅助函数
async function updatePreview(canvas, previewPlaceholder, downloadBtn, targetFormat, fileName) {
    // 创建预览版 canvas
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    
    // 设置预览尺寸
    const maxPreviewSize = 300;
    const scale = Math.min(maxPreviewSize / canvas.width, maxPreviewSize / canvas.height);
    previewCanvas.width = canvas.width * scale;
    previewCanvas.height = canvas.height * scale;
    
    // 绘制预览
    previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    // 更新预览区域
    previewPlaceholder.innerHTML = '';
    previewPlaceholder.appendChild(previewCanvas);
    
    // 添加预览信息
    const infoDiv = document.createElement('div');
    infoDiv.className = 'preview-info';
    infoDiv.innerHTML = `
        <div class="info-item">
            <i class="bi bi-file-earmark"></i>
            格式: ${targetFormat.toUpperCase()}
        </div>
        <div class="info-item">
            <i class="bi bi-arrows-angle-expand"></i>
            尺寸: ${canvas.width} x ${canvas.height}px
        </div>
    `;
    previewPlaceholder.appendChild(infoDiv);
    
    // 准备下载
    canvas.toBlob((blob) => {
        if (!blob) {
            throw new Error('转换失败：无法创建文件');
        }
        
        const newFileName = fileName.split('.')[0] + '.' + targetFormat;
        const url = URL.createObjectURL(blob);
        
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = newFileName;
            a.click();
            URL.revokeObjectURL(url);
        };
        
        downloadBtn.style.display = 'block';
    }, `image/${targetFormat}`, 0.92);
} 