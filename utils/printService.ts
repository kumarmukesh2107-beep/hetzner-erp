
/**
 * Standalone Print Utility for NexusERP
 * Opens a clean window, injects styling, and triggers browser printing.
 */
export const triggerStandalonePrint = (elementId: string, docTitle: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
  const content = document.getElementById(elementId);
  if (!content) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  // Create new window
  const printWindow = window.open('', '_blank', 'width=1100,height=850,scrollbars=yes');
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to view the printable document.");
    return;
  }

  // Clone the styles from the current document or use CDN
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { 
          font-family: 'Inter', sans-serif; 
          background-color: white; 
          margin: 0; 
          padding: 20px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; margin: 0; }
          @page { 
            margin: 0.5cm; 
            size: A4 ${orientation}; 
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        /* Fix for scrollbars and heights in standalone print */
        #printable-erp-doc, #attendance-printable-area { 
          height: auto !important; 
          overflow: visible !important; 
          width: 100% !important;
        }
        table { width: 100% !important; table-layout: fixed; }
      </style>
    </head>
    <body>
      <div class="no-print flex justify-between items-center bg-slate-900 text-white p-4 mb-8 rounded-xl shadow-xl">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">P</div>
          <div>
            <p class="text-xs font-black uppercase tracking-widest">Print Preview</p>
            <p class="text-[9px] text-indigo-400 font-bold uppercase">Mode: ${orientation.toUpperCase()}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="window.print()" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-lg">
            Print Document
          </button>
          <button onclick="window.close()" class="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase rounded-lg transition-all">
            Close Tab
          </button>
        </div>
      </div>
      
      <div id="print-mount-point">
        ${content.innerHTML}
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => {
            window.focus();
            window.print();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
