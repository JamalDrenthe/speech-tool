import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-4 fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center backdrop-blur-md bg-[#18191D]/80 border border-[rgba(230,234,240,0.06)] py-2 px-5 rounded-full shadow-sm">
          {/* Make sure the image file is named logo.png and placed in your public/root directory */}
          <img src="logo.png" alt="JD Logo" className="h-5 w-auto object-contain" />
        </div>
        
        <div className="hidden md:flex items-center gap-6 backdrop-blur-md bg-[#18191D]/80 border border-[rgba(230,234,240,0.06)] py-1.5 px-6 rounded-full shadow-sm">
           <span className="text-sm font-medium text-[#B7BFD9] hover:text-white cursor-pointer transition-colors">Product</span>
           <span className="text-sm font-medium text-[#B7BFD9] hover:text-white cursor-pointer transition-colors">Use Cases</span>
           <span className="text-sm font-medium text-[#B7BFD9] hover:text-white cursor-pointer transition-colors">Resources</span>
        </div>

        {/* Empty div to maintain the center alignment of the navigation links using flex justify-between */}
        <div className="w-20 hidden md:block"></div>
      </div>
    </header>
  );
};

export default Header;