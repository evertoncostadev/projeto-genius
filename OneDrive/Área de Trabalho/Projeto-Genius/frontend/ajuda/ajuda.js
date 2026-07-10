// frontend/ajuda/ajuda.js

function initAjudaAccordion() {
    const headers = document.querySelectorAll('.accordion-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;
            
            const isActive = item.classList.contains('active');


            document.querySelectorAll('.accordion-item.active').forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.accordion-content').style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add('active');

                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
}

setTimeout(initAjudaAccordion, 0);