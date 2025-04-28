/**
 * 图片压缩工具主要功能脚本
 * 实现图片压缩、预览和批量处理功能
 */

// 全局变量
const MAX_FILES = 20;
let currentFiles = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagesList = document.getElementById('imagesList');

    // 文件选择处理
    fileInput.addEventListener('change', handleFiles);

    // 拖放处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles({ target: { files: e.dataTransfer.files } });
    });

    // 添加质量滑块事件监听
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    
    qualitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        qualityValue.textContent = `${value}%`;
        document.querySelector('.quality-tip').textContent = 
            `压缩掉原文件大小的 ${value}%`;
    });

    const startCompressBtn = document.getElementById('startCompress');
    const downloadAllBtn = document.getElementById('downloadAll');

    startCompressBtn.addEventListener('click', async () => {
        if (currentFiles.length === 0) {
            showToast('请先选择图片', 'error');
            return;
        }

        startCompressBtn.disabled = true;
        startCompressBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 压缩中...';

        try {
            const items = document.querySelectorAll('.image-item');
            for (let i = 0; i < currentFiles.length; i++) {
                await processImage(currentFiles[i], items[i]);
            }

            showToast(`成功处理 ${currentFiles.length} 张图片`);
            downloadAllBtn.style.display = 'block';
        } catch (error) {
            console.error('批量处理失败:', error);
            showToast('部分图片处理失败', 'error');
        } finally {
            startCompressBtn.disabled = false;
            startCompressBtn.innerHTML = '<i class="bi bi-play-fill"></i> 开始压缩';
        }
    });

    downloadAllBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('.image-item');
        items.forEach(item => {
            const downloadBtn = item.querySelector('.download-btn');
            if (downloadBtn && downloadBtn.style.display !== 'none') {
                downloadBtn.click();
            }
        });
    });
});

// 在文件开头添加 PDF 转图片的函数
async function convertPDFToImage(file) {
    try {
        // 读取 PDF 文件
        const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('PDF 文件读取失败'));
            reader.readAsArrayBuffer(file);
        });

        // 加载 PDF 文档
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        // 创建一个数组来存储所有页面的 canvas
        const canvases = [];
        
        // 处理每一页
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
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

            // 将 canvas 转换为 Blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.92);
            });

            // 创建文件对象
            const imageFile = new File([blob], `page_${pageNum}.jpg`, {
                type: 'image/jpeg'
            });

            canvases.push(imageFile);
        }

        return canvases;
    } catch (error) {
        console.error('PDF 转换失败:', error);
        throw new Error('PDF 转换失败: ' + error.message);
    }
}

// 修改 handleFiles 函数
async function handleFiles(event) {
    const files = Array.from(event.target.files).filter(file => 
        file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (files.length === 0) {
        showToast('请选择有效的文件格式', 'error');
        return;
    }

    if (files.length > MAX_FILES) {
        showToast(`最多只能选择 ${MAX_FILES} 个文件`, 'error');
        return;
    }

    const imagesList = document.getElementById('imagesList');
    imagesList.innerHTML = ''; // 清空列表

    currentFiles = files;

    // 创建预览
    for (const file of files) {
        const imageItem = createImageItem(file);
        imagesList.appendChild(imageItem);
        await showPreview(file, imageItem);
    }

    // 显示压缩按钮
    document.getElementById('startCompress').style.display = 'block';
}

// 修改 showPreview 函数
async function showPreview(file, imageItem) {
    try {
        const originalPreview = imageItem.querySelector('.original');
        
        if (file.type === 'application/pdf') {
            // PDF 预览处理
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1); // 获取第一页用于预览
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // 设置预览尺寸
            const viewport = page.getViewport({ scale: 1.0 });
            const scale = Math.min(300 / viewport.height, 1.0);
            const scaledViewport = page.getViewport({ scale });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;

            originalPreview.src = canvas.toDataURL();

            // 更新文件信息
            imageItem.querySelector('.dimensions').textContent = 
                `PDF - ${pdf.numPages} 页`;
        } else {
            // 图片预览处理
            const originalUrl = URL.createObjectURL(file);
            originalPreview.src = originalUrl;

            // 获取图片尺寸
            const dimensions = await getImageDimensions(originalUrl);
            imageItem.querySelector('.dimensions').textContent = 
                `${dimensions.width} × ${dimensions.height}`;
        }

        // 显示原始文件大小
        imageItem.querySelector('.compressed-size').textContent = 
            `等待压缩... (原始大小: ${formatFileSize(file.size)})`;

    } catch (error) {
        console.error('预览失败:', error);
        showToast('文件预览失败', 'error');
    }
}

// 修改 createImageItem 函数，添加页码显示
function createImageItem(file) {
    const item = document.createElement('div');
    item.className = 'image-item';
    
    // 检查文件名是否包含页码信息
    const isFromPDF = file.name.match(/page_(\d+)\.jpg/);
    const pageInfo = isFromPDF ? `<span class="page-info">第 ${isFromPDF[1]} 页</span>` : '';

    item.innerHTML = `
        <div class="image-preview-container">
            <div class="original-preview">
                <h4>原图 ${pageInfo}</h4>
                <div class="image-preview-wrapper">
                    <img class="image-preview original" alt="原图预览">
                </div>
                <div class="image-info">
                    <span>大小: ${formatFileSize(file.size)}</span>
                    <span class="dimensions"></span>
                </div>
            </div>
            <div class="compressed-preview">
                <h4>压缩后</h4>
                <div class="image-preview-wrapper">
                    <img class="image-preview compressed" alt="压缩后预览">
                </div>
                <div class="image-info">
                    <span class="compressed-size">等待压缩...</span>
                    <button class="download-btn" style="display: none;">
                        <i class="bi bi-download"></i> 下载
                    </button>
                </div>
            </div>
        </div>
    `;

    // 添加点击预览功能
    const previewWrappers = item.querySelectorAll('.image-preview-wrapper');
    previewWrappers.forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            const img = wrapper.querySelector('.image-preview');
            showImageModal(img.src);
        });
    });

    return item;
}

// 添加全屏预览功能
function showImageModal(src) {
    let modal = document.querySelector('.image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `<img src="${src}" alt="预览图片">`;
        document.body.appendChild(modal);
        
        // 点击关闭
        modal.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
    } else {
        modal.querySelector('img').src = src;
    }
    
    // 显示模态框
    setTimeout(() => modal.classList.add('active'), 10);
}

// 修改 processImage 函数
async function processImage(file, imageItem) {
    try {
        if (file.type === 'application/pdf') {
            await processPDF(file, imageItem);
        } else {
            await processImageFile(file, imageItem);
        }
    } catch (error) {
        console.error('文件处理失败:', error);
        showToast('文件处理失败', 'error');
    }
}

// 添加 PDF 处理函数
async function processPDF(file, imageItem) {
    try {
        // 添加进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'compression-progress';
        progressBar.innerHTML = '<div class="progress-bar"></div>';
        imageItem.appendChild(progressBar);

        // 获取压缩比例
        const compressionRatio = parseInt(document.getElementById('quality').value) / 100;

        // 读取 PDF 文件
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        // 创建新的 PDF 文档，先不指定尺寸和方向
        const { jsPDF } = window.jspdf;
        let newPdf = null;

        // 处理每一页
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });

            // 创建 canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // 设置 canvas 尺寸为页面实际尺寸
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // 渲染页面到 canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // 将 canvas 转换为图片数据
            const imgData = canvas.toDataURL('image/jpeg', 1 - compressionRatio);

            // 如果是第一页，初始化 PDF 文档并设置正确的尺寸和方向
            if (pageNum === 1) {
                // 处理长图情况
                let orientation = viewport.width > viewport.height ? 'l' : 'p';
                let format = [viewport.width, viewport.height];

                // 检查是否需要缩放（如果尺寸超过 jsPDF 的限制）
                const MAX_PDF_SIZE = 14400; // jsPDF 的最大尺寸限制
                if (viewport.width > MAX_PDF_SIZE || viewport.height > MAX_PDF_SIZE) {
                    const scale = Math.min(MAX_PDF_SIZE / viewport.width, MAX_PDF_SIZE / viewport.height);
                    format = [viewport.width * scale, viewport.height * scale];
                }

                newPdf = new jsPDF({
                    orientation: orientation,
                    unit: 'pt', // 使用点作为单位
                    format: format,
                    compress: true, // 启用压缩
                    putOnlyUsedFonts: true, // 只嵌入使用的字体
                    precision: 2 // 减少精度以减小文件大小
                });
            } else {
                // 为后续页面添加新页，同样处理长图情况
                let pageWidth = viewport.width;
                let pageHeight = viewport.height;

                // 检查是否需要缩放
                const MAX_PDF_SIZE = 14400;
                if (pageWidth > MAX_PDF_SIZE || pageHeight > MAX_PDF_SIZE) {
                    const scale = Math.min(MAX_PDF_SIZE / pageWidth, MAX_PDF_SIZE / pageHeight);
                    pageWidth *= scale;
                    pageHeight *= scale;
                }

                newPdf.addPage([pageWidth, pageHeight]);
            }

            try {
                // 添加图片到 PDF，处理长图情况
                const pageWidth = newPdf.internal.pageSize.getWidth();
                const pageHeight = newPdf.internal.pageSize.getHeight();

                // 计算图片缩放比例，确保适应页面
                const imgRatio = viewport.width / viewport.height;
                const pageRatio = pageWidth / pageHeight;

                let imgWidth = pageWidth;
                let imgHeight = pageWidth / imgRatio;

                if (imgHeight > pageHeight) {
                    imgHeight = pageHeight;
                    imgWidth = pageHeight * imgRatio;
                }

                // 计算居中位置
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;

                // 使用 addImage 的完整参数来确保正确处理
                newPdf.addImage(
                    imgData,
                    'JPEG',
                    x,
                    y,
                    imgWidth,
                    imgHeight,
                    `page-${pageNum}`,
                    'FAST',
                    0 // 旋转角度
                );
            } catch (addImageError) {
                console.error('添加图片到PDF失败:', addImageError);
                throw new Error('处理长图失败，请尝试降低压缩比例');
            }

            // 更新进度条
            const progress = pageNum / numPages;
            const progressBarElement = progressBar.querySelector('.progress-bar');
            progressBarElement.style.width = `${progress * 100}%`;
        }

        // 生成压缩后的 PDF，使用优化的设置
        const compressedPdfBlob = await newPdf.output('blob');

        // 显示压缩后预览（第一页）
        const compressedArrayBuffer = await compressedPdfBlob.arrayBuffer();
        const compressedPdf = await pdfjsLib.getDocument({ data: compressedArrayBuffer }).promise;
        const firstPage = await compressedPdf.getPage(1);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const scale = Math.min(300 / viewport.height, 1.0);
        const scaledViewport = firstPage.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        await firstPage.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        const compressedPreview = imageItem.querySelector('.compressed');
        compressedPreview.src = canvas.toDataURL();

        // 更新压缩信息
        const actualRatio = ((1 - compressedPdfBlob.size / file.size) * 100).toFixed(1);
        imageItem.querySelector('.compressed-size').textContent = 
            `${formatFileSize(compressedPdfBlob.size)} (压缩了 ${actualRatio}%)`;

        // 设置下载按钮
        const downloadBtn = imageItem.querySelector('.download-btn');
        downloadBtn.style.display = 'block';
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(compressedPdfBlob);
            link.download = `compressed_${file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        };

        // 移除进度条
        setTimeout(() => {
            progressBar.remove();
        }, 500);

    } catch (error) {
        console.error('PDF 处理失败:', error);
        imageItem.querySelector('.compressed-size').textContent = 'PDF 处理失败';
        showToast('PDF 处理失败: ' + error.message, 'error');
    }
}

// 重命名原来的 processImage 函数为 processImageFile
async function processImageFile(file, imageItem) {
    try {
        // 显示原图预览
        const originalPreview = imageItem.querySelector('.original');
        const originalUrl = URL.createObjectURL(file);
        originalPreview.src = originalUrl;

        // 获取图片尺寸
        const dimensions = await getImageDimensions(originalUrl);
        imageItem.querySelector('.dimensions').textContent = 
            `${dimensions.width} × ${dimensions.height}`;

        // 添加进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'compression-progress';
        progressBar.innerHTML = '<div class="progress-bar"></div>';
        imageItem.appendChild(progressBar);

        // 获取压缩比例
        const compressionRatio = parseInt(document.getElementById('quality').value) / 100;
        const targetSize = file.size * (1 - compressionRatio);

        // 优化的压缩配置
        const options = {
            maxSizeMB: targetSize / (1024 * 1024),
            useWebWorker: true,
            maxIteration: 10,
            initialQuality: 0.9,
            alwaysKeepResolution: true,
            exifOrientation: true,
            fileType: 'image/jpeg',
            strict: false,
            onProgress: (progress) => {
                const progressBarElement = progressBar.querySelector('.progress-bar');
                progressBarElement.style.width = `${progress * 100}%`;
            }
        };

        try {
            // 压缩图片
            let compressedFile = await imageCompression(file, options);
            
            // 如果压缩后的文件仍然太大，尝试逐步降低质量
            let quality = 0.9;
            while (compressedFile.size > targetSize && quality > 0.5) {
                quality -= 0.1;
                options.initialQuality = quality;
                compressedFile = await imageCompression(file, options);
            }

            const compressedUrl = URL.createObjectURL(compressedFile);
            
            // 显示压缩后预览
            const compressedPreview = imageItem.querySelector('.compressed');
            compressedPreview.src = compressedUrl;
            
            // 更新压缩信息
            const actualRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
            imageItem.querySelector('.compressed-size').textContent = 
                `${formatFileSize(compressedFile.size)} (压缩了 ${actualRatio}%)`;

            // 存储压缩的文件以供下载
            imageItem.dataset.compressedFile = compressedUrl;

            // 显示下载按钮
            const downloadBtn = imageItem.querySelector('.download-btn');
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => downloadImage(compressedFile, file.name);

            // 移除进度条
            setTimeout(() => {
                progressBar.remove();
            }, 500);

        } catch (compressionError) {
            console.error('压缩失败:', compressionError);
            imageItem.querySelector('.compressed-size').textContent = '压缩失败';
            progressBar.remove();
        }

    } catch (error) {
        console.error('图片处理失败:', error);
        showToast('图片处理失败', 'error');
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

async function getImageDimensions(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = url;
    });
}

function downloadImage(file, originalName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `compressed_${originalName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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