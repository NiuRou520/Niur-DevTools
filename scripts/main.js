// 添加错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    // 显示用户友好的错误信息
    showAccessibleError(e.message);
});

// 可访问性提示
function showAccessibleError(message) {
    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', 'polite');
    alert.className = 'error-message';
    alert.textContent = message;
    document.body.appendChild(alert);
}

// 添加 FAQ 交互功能
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        // 初始化状态
        if (!item.classList.contains('active')) {
            answer.style.maxHeight = '0';
            answer.style.padding = '0';
        }
        
        question.addEventListener('click', () => {
            // 切换当前项目的状态
            const isActive = item.classList.toggle('active');
            
            if (isActive) {
                // 展开当前项目
                answer.style.maxHeight = answer.scrollHeight + 'px';
                answer.style.padding = '1rem 0';
                
                // 关闭其他项目
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        otherItem.classList.remove('active');
                        otherAnswer.style.maxHeight = '0';
                        otherAnswer.style.padding = '0';
                    }
                });
            } else {
                // 收起当前项目
                answer.style.maxHeight = '0';
                answer.style.padding = '0';
            }
        });
    });
}); 