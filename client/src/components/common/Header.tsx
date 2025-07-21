/**
 * Header.tsx - Application header component for the Budget Application
 * 
 * <description>
 *   This component serves as the primary navigation header, providing users with
 *   application branding, page navigation controls, and status indicators.
 *   Features include responsive navigation menu, page state management, and live tracking status.
 * </description>
 * 
 * <component name="Header" />
 * <returns>JSX.Element - The application header interface with navigation</returns>
 */

import { Brain, History } from 'lucide-react';

/* <interface>
     <name>HeaderProps</name>
     <purpose>Type definition for header component properties</purpose>
   </interface> */
interface HeaderProps {
  currentPage: 'dashboard' | 'previous' | 'advisor';  // <prop>Current active page identifier</prop>
  setCurrentPage: (page: 'dashboard' | 'previous' | 'advisor') => void;  // <prop>Page navigation function</prop>
}

const Header = ({ currentPage, setCurrentPage }: HeaderProps) => {
  return (
    /* <header-container>
         <styling>Semi-transparent background with backdrop blur effect</styling>
         <purpose>Main application header with navigation controls</purpose>
       </header-container> */
    <div className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
      {/* <content-wrapper>
           <responsive>Max width container with responsive padding</responsive>
           <layout>Centered content with horizontal constraints</layout>
         </content-wrapper> */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* <header-content>
             <layout>Flexbox with space-between alignment</layout>
             <structure>Brand section and navigation section</structure>
           </header-content> */}
        <div className="flex justify-between items-center py-6">
          
          {/* <brand-section>
               <layout>Horizontal flex layout with spacing</layout>
               <components>Logo icon and brand text</components>
             </brand-section> */}
          <div className="flex items-center space-x-4">
            {/* <logo-container>
                 <styling>Relative positioning for notification badge</styling>
                 <purpose>Brand identity and visual recognition</purpose>
               </logo-container> */}
            <div className="relative">
              {/* <logo-icon>
                   <styling>Gradient background with hover animation</styling>
                   <content>Emoji-based logo design</content>
                 </logo-icon> */}
              <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                <span className="text-white text-xl font-bold">E💵</span>
              </div>
              {/* <notification-badge>
                   <animation>Pulsing animation for attention</animation>
                   <purpose>Live activity indicator</purpose>
                 </notification-badge> */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
            </div>
            
            {/* <brand-text>
                 <structure>Application name and tagline</structure>
                 <styling>Gradient text with responsive typography</styling>
               </brand-text> */}
            <div>
              {/* <application-title>
                   <styling>Large gradient text with clip-path effect</styling>
                   <branding>Primary application identity</branding>
                 </application-title> */}
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                MoneyWise
              </h1>
              {/* <tagline>
                   <purpose>Brief description of application purpose</purpose>
                   <styling>Subtle gray text with medium font weight</styling>
                 </tagline> */}
              <p className="text-sm text-gray-600 font-medium">Smart financial tracking</p>
            </div>
          </div>
          
          {/* <navigation-section>
               <layout>Horizontal flex with navigation and status elements</layout>
               <responsive>Hidden on mobile, visible on medium screens and up</responsive>
             </navigation-section> */}
          <div className="flex items-center space-x-4">
            {/* <navigation-menu>
                 <styling>Semi-transparent background with rounded pill shape</styling>
                 <responsive>Hidden on mobile devices</responsive>
                 <purpose>Primary application navigation</purpose>
               </navigation-menu> */}
            <nav className="hidden md:flex items-center space-x-1 bg-white/50 rounded-full p-1">
              
              {/* <nav-button type="dashboard">
                   <state>Conditional active styling based on current page</state>
                   <functionality>Navigation to dashboard page</functionality>
                 </nav-button> */}
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${currentPage === 'dashboard'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Dashboard
              </button>
              
              {/* <nav-button type="previous-months">
                   <icon>History - Represents historical data</icon>
                   <state>Purple theme when active</state>
                   <functionality>Navigation to previous months page</functionality>
                 </nav-button> */}
              <button
                onClick={() => setCurrentPage('previous')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${currentPage === 'previous'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Previous Months</span>
              </button>
              
              {/* <nav-button type="ai-advisor">
                   <icon>Brain - Represents artificial intelligence</icon>
                   <state>Dark theme when active</state>
                   <functionality>Navigation to AI advisor page</functionality>
                 </nav-button> */}
              <button
                onClick={() => setCurrentPage('advisor')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${currentPage === 'advisor'
                  ? 'bg-gray-700 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>AI Advisor</span>
              </button>
            </nav>
            
            {/* <status-indicator>
                 <purpose>Live tracking status display</purpose>
                 <responsive>Hidden on mobile devices</responsive>
                 <animation>Pulsing green dot for active status</animation>
               </status-indicator> */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 bg-white/50 px-4 py-2 rounded-full">
              {/* <status-dot>
                   <color>Green indicating active status</color>
                   <animation>Pulsing effect for visual attention</animation>
                 </status-dot> */}
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {/* <status-text>
                   <content>Descriptive text for current tracking state</content>
                   <styling>Small gray text for subtle information display</styling>
                 </status-text> */}
              <span>Live tracking active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;