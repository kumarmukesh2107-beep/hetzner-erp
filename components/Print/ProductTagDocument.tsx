import React from 'react';
import { Product } from '../../types';

interface ProductTagDocumentProps {
  product: Product;
}

const ProductTagDocument: React.FC<ProductTagDocumentProps> = ({ product }) => {
  const qrData = encodeURIComponent(`${product.name}|${product.modelNo}|${product.brand}|${product.salesPrice}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;

  return (
    <div
      id="printable-product-tag"
      className="bg-white border border-slate-300 overflow-hidden"
      style={{ width: '8.65cm', height: '10.65cm' }}
    >
      <div className="flex justify-center pt-2">
        <img src={qrUrl} alt="QR" className="w-[3.6cm] h-[3.6cm]" />
      </div>

      <table className="w-full mt-2 border-collapse text-[11px]">
        <tbody>
          <tr><td className="border px-2 py-1 font-medium">ITEM</td><td className="border px-2 py-1 font-bold uppercase">{product.name}</td></tr>
          <tr><td className="border px-2 py-1 font-medium">MODEL</td><td className="border px-2 py-1 font-bold uppercase">{product.modelNo}</td></tr>
          <tr><td className="border px-2 py-1 font-medium">BRAND</td><td className="border px-2 py-1 font-bold uppercase">{product.brand}</td></tr>
          <tr><td className="border px-2 py-1 font-medium">COLOUR</td><td className="border px-2 py-1 font-bold uppercase">{product.color || 'NA'}</td></tr>
          <tr><td className="border px-2 py-1 font-medium">MRP</td><td className="border px-2 py-1 font-bold">{product.salesPrice.toLocaleString()}/-* </td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default ProductTagDocument;
