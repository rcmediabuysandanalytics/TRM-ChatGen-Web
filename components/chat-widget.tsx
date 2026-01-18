'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'lead_form';
    showLeaveMessageAction?: boolean;
}

interface ResponsiveConfig {
    position?: 'bottom-right' | 'bottom-left';
    bottom_px?: number;
    right_px?: number;
    launcher_size_px?: number;
    width_px?: number;
    height_px?: number;
}

interface ChatTheme {
    primary_color?: string;
    header_color?: string;
    background_color?: string;
    text_color?: string;
    title_color?: string;
    bot_msg_color?: string;
    bot_msg_text_color?: string;
    booking_link?: string;
    link_color?: string;
    responsive?: {
        mobile?: ResponsiveConfig;
        laptop?: ResponsiveConfig;
        desktop?: ResponsiveConfig;
    };
    // Legacy support
    position?: 'bottom-right' | 'bottom-left';
}

interface ChatWidgetProps {
    theme?: ChatTheme;
    botName?: string;
    welcomeMessage?: string;
    clientId?: string;
    forcedDevice?: 'mobile' | 'laptop' | 'desktop';
    logoUrl?: string;
}

function QuickActionButton({ label, onClick, color, disabled }: { label: string, onClick: () => void, color: string, disabled?: boolean }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-200 disabled:opacity-50"
            style={{
                borderColor: color,
                color: isHovered ? '#ffffff' : color,
                backgroundColor: isHovered ? color : 'transparent'
            }}
            disabled={disabled}
        >
            {label}
        </button>
    );
}

const COUNTRIES = [
    { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dial_code: '+93' },
    { code: 'AL', name: 'Albania', flag: '🇦🇱', dial_code: '+355' },
    { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dial_code: '+213' },
    { code: 'AS', name: 'American Samoa', flag: '🇦🇸', dial_code: '+1' },
    { code: 'AD', name: 'Andorra', flag: '🇦🇩', dial_code: '+376' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴', dial_code: '+244' },
    { code: 'AI', name: 'Anguilla', flag: '🇦🇮', dial_code: '+1' },
    { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', dial_code: '+1' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial_code: '+54' },
    { code: 'AM', name: 'Armenia', flag: '🇦🇲', dial_code: '+374' },
    { code: 'AW', name: 'Aruba', flag: '🇦🇼', dial_code: '+297' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', dial_code: '+61' },
    { code: 'AT', name: 'Austria', flag: '🇦🇹', dial_code: '+43' },
    { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', dial_code: '+994' },
    { code: 'BS', name: 'Bahamas', flag: '🇧🇸', dial_code: '+1' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dial_code: '+973' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial_code: '+880' },
    { code: 'BB', name: 'Barbados', flag: '🇧🇧', dial_code: '+1' },
    { code: 'BY', name: 'Belarus', flag: '🇧🇾', dial_code: '+375' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial_code: '+32' },
    { code: 'BZ', name: 'Belize', flag: '🇧🇿', dial_code: '+501' },
    { code: 'BJ', name: 'Benin', flag: '🇧🇯', dial_code: '+229' },
    { code: 'BM', name: 'Bermuda', flag: '🇧🇲', dial_code: '+1' },
    { code: 'BT', name: 'Bhutan', flag: '🇧🇹', dial_code: '+975' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dial_code: '+591' },
    { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', dial_code: '+387' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼', dial_code: '+267' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial_code: '+55' },
    { code: 'IO', name: 'British Indian Ocean Territory', flag: '🇮🇴', dial_code: '+246' },
    { code: 'VG', name: 'British Virgin Islands', flag: '🇻🇬', dial_code: '+1' },
    { code: 'BN', name: 'Brunei', flag: '🇧🇳', dial_code: '+673' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', dial_code: '+359' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial_code: '+226' },
    { code: 'BI', name: 'Burundi', flag: '🇧🇮', dial_code: '+257' },
    { code: 'KH', name: 'Cambodia', flag: '🇰🇭', dial_code: '+855' },
    { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dial_code: '+237' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', dial_code: '+1' },
    { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', dial_code: '+238' },
    { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾', dial_code: '+1' },
    { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', dial_code: '+236' },
    { code: 'TD', name: 'Chad', flag: '🇹🇩', dial_code: '+235' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', dial_code: '+56' },
    { code: 'CN', name: 'China', flag: '🇨🇳', dial_code: '+86' },
    { code: 'CX', name: 'Christmas Island', flag: '🇨🇽', dial_code: '+61' },
    { code: 'CC', name: 'Cocos Islands', flag: '🇨🇨', dial_code: '+61' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial_code: '+57' },
    { code: 'KM', name: 'Comoros', flag: '🇰🇲', dial_code: '+269' },
    { code: 'CK', name: 'Cook Islands', flag: '🇨🇰', dial_code: '+682' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dial_code: '+506' },
    { code: 'HR', name: 'Croatia', flag: '🇭🇷', dial_code: '+385' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺', dial_code: '+53' },
    { code: 'CW', name: 'Curacao', flag: '🇨🇼', dial_code: '+599' },
    { code: 'CY', name: 'Cyprus', flag: '🇨🇾', dial_code: '+357' },
    { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dial_code: '+420' },
    { code: 'CD', name: 'Democratic Republic of the Congo', flag: '🇨🇩', dial_code: '+243' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰', dial_code: '+45' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dial_code: '+253' },
    { code: 'DM', name: 'Dominica', flag: '🇩🇲', dial_code: '+1' },
    { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', dial_code: '+1' },
    { code: 'TL', name: 'East Timor', flag: '🇹🇱', dial_code: '+670' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dial_code: '+593' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial_code: '+20' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dial_code: '+503' },
    { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', dial_code: '+240' },
    { code: 'ER', name: 'Eritrea', flag: '🇪🇷', dial_code: '+291' },
    { code: 'EE', name: 'Estonia', flag: '🇪🇪', dial_code: '+372' },
    { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dial_code: '+251' },
    { code: 'FK', name: 'Falkland Islands', flag: '🇫🇰', dial_code: '+500' },
    { code: 'FO', name: 'Faroe Islands', flag: '🇫🇴', dial_code: '+298' },
    { code: 'FJ', name: 'Fiji', flag: '🇫🇯', dial_code: '+679' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮', dial_code: '+358' },
    { code: 'FR', name: 'France', flag: '🇫🇷', dial_code: '+33' },
    { code: 'GF', name: 'French Guiana', flag: '🇬🇫', dial_code: '+594' },
    { code: 'PF', name: 'French Polynesia', flag: '🇵🇫', dial_code: '+689' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial_code: '+241' },
    { code: 'GM', name: 'Gambia', flag: '🇬🇲', dial_code: '+220' },
    { code: 'GE', name: 'Georgia', flag: '🇬🇪', dial_code: '+995' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', dial_code: '+49' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial_code: '+233' },
    { code: 'GI', name: 'Gibraltar', flag: '🇬🇮', dial_code: '+350' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷', dial_code: '+30' },
    { code: 'GL', name: 'Greenland', flag: '🇬🇱', dial_code: '+299' },
    { code: 'GD', name: 'Grenada', flag: '🇬🇩', dial_code: '+1' },
    { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵', dial_code: '+590' },
    { code: 'GU', name: 'Guam', flag: '🇬🇺', dial_code: '+1' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dial_code: '+502' },
    { code: 'GG', name: 'Guernsey', flag: '🇬🇬', dial_code: '+44' },
    { code: 'GN', name: 'Guinea', flag: '🇬🇳', dial_code: '+224' },
    { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', dial_code: '+245' },
    { code: 'GY', name: 'Guyana', flag: '🇬🇾', dial_code: '+592' },
    { code: 'HT', name: 'Haiti', flag: '🇭🇹', dial_code: '+509' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳', dial_code: '+504' },
    { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dial_code: '+852' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺', dial_code: '+36' },
    { code: 'IS', name: 'Iceland', flag: '🇮🇸', dial_code: '+354' },
    { code: 'IN', name: 'India', flag: '🇮🇳', dial_code: '+91' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial_code: '+62' },
    { code: 'IR', name: 'Iran', flag: '🇮🇷', dial_code: '+98' },
    { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dial_code: '+964' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial_code: '+353' },
    { code: 'IM', name: 'Isle of Man', flag: '🇮🇲', dial_code: '+44' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱', dial_code: '+972' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', dial_code: '+39' },
    { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮', dial_code: '+225' },
    { code: 'JM', name: 'Jamaica', flag: '🇯🇲', dial_code: '+1' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', dial_code: '+81' },
    { code: 'JE', name: 'Jersey', flag: '🇯🇪', dial_code: '+44' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴', dial_code: '+962' },
    { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dial_code: '+7' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial_code: '+254' },
    { code: 'KI', name: 'Kiribati', flag: '🇰🇮', dial_code: '+686' },
    { code: 'XK', name: 'Kosovo', flag: '🇽🇰', dial_code: '+383' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dial_code: '+965' },
    { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', dial_code: '+996' },
    { code: 'LA', name: 'Laos', flag: '🇱🇦', dial_code: '+856' },
    { code: 'LV', name: 'Latvia', flag: '🇱🇻', dial_code: '+371' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dial_code: '+961' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dial_code: '+266' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷', dial_code: '+231' },
    { code: 'LY', name: 'Libya', flag: '🇱🇾', dial_code: '+218' },
    { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', dial_code: '+423' },
    { code: 'LT', name: 'Lithuania', flag: '🇱🇹', dial_code: '+370' },
    { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dial_code: '+352' },
    { code: 'MO', name: 'Macau', flag: '🇲🇴', dial_code: '+853' },
    { code: 'MK', name: 'Macedonia', flag: '🇲🇰', dial_code: '+389' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dial_code: '+261' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼', dial_code: '+265' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial_code: '+60' },
    { code: 'MV', name: 'Maldives', flag: '🇲🇻', dial_code: '+960' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', dial_code: '+223' },
    { code: 'MT', name: 'Malta', flag: '🇲🇹', dial_code: '+356' },
    { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', dial_code: '+692' },
    { code: 'MQ', name: 'Martinique', flag: '🇲🇶', dial_code: '+596' },
    { code: 'MR', name: 'Mauritania', flag: '🇲🇷', dial_code: '+222' },
    { code: 'MU', name: 'Mauritius', flag: '🇲🇺', dial_code: '+230' },
    { code: 'YT', name: 'Mayotte', flag: '🇾🇹', dial_code: '+262' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial_code: '+52' },
    { code: 'FM', name: 'Micronesia', flag: '🇫🇲', dial_code: '+691' },
    { code: 'MD', name: 'Moldova', flag: '🇲🇩', dial_code: '+373' },
    { code: 'MC', name: 'Monaco', flag: '🇲🇨', dial_code: '+377' },
    { code: 'MN', name: 'Mongolia', flag: '🇲🇳', dial_code: '+976' },
    { code: 'ME', name: 'Montenegro', flag: '🇲🇪', dial_code: '+382' },
    { code: 'MS', name: 'Montserrat', flag: '🇲🇸', dial_code: '+1' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', dial_code: '+212' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dial_code: '+258' },
    { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dial_code: '+95' },
    { code: 'NA', name: 'Namibia', flag: '🇳🇦', dial_code: '+264' },
    { code: 'NR', name: 'Nauru', flag: '🇳🇷', dial_code: '+674' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵', dial_code: '+977' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial_code: '+31' },
    { code: 'NC', name: 'New Caledonia', flag: '🇳🇨', dial_code: '+687' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial_code: '+64' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dial_code: '+505' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', dial_code: '+227' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial_code: '+234' },
    { code: 'NU', name: 'Niue', flag: '🇳🇺', dial_code: '+683' },
    { code: 'NF', name: 'Norfolk Island', flag: '🇳🇫', dial_code: '+672' },
    { code: 'KP', name: 'North Korea', flag: '🇰🇵', dial_code: '+850' },
    { code: 'MP', name: 'Northern Mariana Islands', flag: '🇲🇵', dial_code: '+1' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴', dial_code: '+47' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', dial_code: '+968' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial_code: '+92' },
    { code: 'PW', name: 'Palau', flag: '🇵🇼', dial_code: '+680' },
    { code: 'PS', name: 'Palestine', flag: '🇵🇸', dial_code: '+970' },
    { code: 'PA', name: 'Panama', flag: '🇵🇦', dial_code: '+507' },
    { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', dial_code: '+675' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dial_code: '+595' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪', dial_code: '+51' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial_code: '+63' },
    { code: 'PN', name: 'Pitcairn', flag: '🇵🇳', dial_code: '+64' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱', dial_code: '+48' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial_code: '+351' },
    { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', dial_code: '+1' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', dial_code: '+974' },
    { code: 'CG', name: 'Republic of the Congo', flag: '🇨🇬', dial_code: '+242' },
    { code: 'RE', name: 'Reunion', flag: '🇷🇪', dial_code: '+262' },
    { code: 'RO', name: 'Romania', flag: '🇷🇴', dial_code: '+40' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺', dial_code: '+7' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial_code: '+250' },
    { code: 'BL', name: 'Saint Barthelemy', flag: '🇧🇱', dial_code: '+590' },
    { code: 'SH', name: 'Saint Helena', flag: '🇸🇭', dial_code: '+290' },
    { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', dial_code: '+1' },
    { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', dial_code: '+1' },
    { code: 'MF', name: 'Saint Martin', flag: '🇲🇫', dial_code: '+590' },
    { code: 'PM', name: 'Saint Pierre and Miquelon', flag: '🇵🇲', dial_code: '+508' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', dial_code: '+1' },
    { code: 'WS', name: 'Samoa', flag: '🇼🇸', dial_code: '+685' },
    { code: 'SM', name: 'San Marino', flag: '🇸🇲', dial_code: '+378' },
    { code: 'ST', name: 'Sao Tome and Principe', flag: '🇸🇹', dial_code: '+239' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial_code: '+966' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳', dial_code: '+221' },
    { code: 'RS', name: 'Serbia', flag: '🇷🇸', dial_code: '+381' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dial_code: '+248' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dial_code: '+232' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial_code: '+65' },
    { code: 'SX', name: 'Sint Maarten', flag: '🇸🇽', dial_code: '+1' },
    { code: 'SK', name: 'Slovakia', flag: '🇸🇰', dial_code: '+421' },
    { code: 'SI', name: 'Slovenia', flag: '🇸🇮', dial_code: '+386' },
    { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', dial_code: '+677' },
    { code: 'SO', name: 'Somalia', flag: '🇸🇴', dial_code: '+252' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial_code: '+27' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷', dial_code: '+82' },
    { code: 'SS', name: 'South Sudan', flag: '🇸🇸', dial_code: '+211' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', dial_code: '+34' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dial_code: '+94' },
    { code: 'SD', name: 'Sudan', flag: '🇸🇩', dial_code: '+249' },
    { code: 'SR', name: 'Suriname', flag: '🇸🇷', dial_code: '+597' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen', flag: '🇸🇯', dial_code: '+47' },
    { code: 'SZ', name: 'Swaziland', flag: '🇸🇿', dial_code: '+268' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial_code: '+46' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dial_code: '+41' },
    { code: 'SY', name: 'Syria', flag: '🇸🇾', dial_code: '+963' },
    { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dial_code: '+886' },
    { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', dial_code: '+992' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial_code: '+255' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial_code: '+66' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', dial_code: '+228' },
    { code: 'TK', name: 'Tokelau', flag: '🇹🇰', dial_code: '+690' },
    { code: 'TO', name: 'Tonga', flag: '🇹🇴', dial_code: '+676' },
    { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', dial_code: '+1' },
    { code: 'TN', name: 'Tunisia', flag: '🇹🇳', dial_code: '+216' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial_code: '+90' },
    { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', dial_code: '+993' },
    { code: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨', dial_code: '+1' },
    { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', dial_code: '+688' },
    { code: 'VI', name: 'U.S. Virgin Islands', flag: '🇻🇮', dial_code: '+1' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬', dial_code: '+256' },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial_code: '+380' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial_code: '+971' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial_code: '+44' },
    { code: 'US', name: 'United States', flag: '🇺🇸', dial_code: '+1' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dial_code: '+598' },
    { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', dial_code: '+998' },
    { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', dial_code: '+678' },
    { code: 'VA', name: 'Vatican', flag: '🇻🇦', dial_code: '+379' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dial_code: '+58' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial_code: '+84' },
    { code: 'WF', name: 'Wallis and Futuna', flag: '🇼🇫', dial_code: '+681' },
    { code: 'EH', name: 'Western Sahara', flag: '🇪🇭', dial_code: '+212' },
    { code: 'YE', name: 'Yemen', flag: '🇾🇪', dial_code: '+967' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲', dial_code: '+260' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dial_code: '+263' }
];

const getCountryFromTimezone = () => {
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timeZone) return COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0];

        // Specific mappings (Priority 1)
        if (timeZone.startsWith('Australia/')) return COUNTRIES.find(c => c.code === 'AU') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/London')) return COUNTRIES.find(c => c.code === 'GB') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/Berlin')) return COUNTRIES.find(c => c.code === 'DE') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/Paris')) return COUNTRIES.find(c => c.code === 'FR') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/Rome')) return COUNTRIES.find(c => c.code === 'IT') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/Madrid')) return COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/Lisbon')) return COUNTRIES.find(c => c.code === 'PT') || COUNTRIES[0];
        if (timeZone.startsWith('Europe/Moscow')) return COUNTRIES.find(c => c.code === 'RU') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Manila')) return COUNTRIES.find(c => c.code === 'PH') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Kolkata')) return COUNTRIES.find(c => c.code === 'IN') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Shanghai')) return COUNTRIES.find(c => c.code === 'CN') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Tokyo')) return COUNTRIES.find(c => c.code === 'JP') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Seoul')) return COUNTRIES.find(c => c.code === 'KR') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Singapore')) return COUNTRIES.find(c => c.code === 'SG') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Bangkok')) return COUNTRIES.find(c => c.code === 'TH') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Hong_Kong')) return COUNTRIES.find(c => c.code === 'HK') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Dubai')) return COUNTRIES.find(c => c.code === 'AE') || COUNTRIES[0];
        if (timeZone.startsWith('Asia/Riyadh')) return COUNTRIES.find(c => c.code === 'SA') || COUNTRIES[0];
        if (timeZone.startsWith('America/Toronto')) return COUNTRIES.find(c => c.code === 'CA') || COUNTRIES[0];
        if (timeZone.startsWith('America/Vancouver')) return COUNTRIES.find(c => c.code === 'CA') || COUNTRIES[0];
        if (timeZone.startsWith('America/Sao_Paulo')) return COUNTRIES.find(c => c.code === 'BR') || COUNTRIES[0];
        if (timeZone.startsWith('Africa/Johannesburg')) return COUNTRIES.find(c => c.code === 'ZA') || COUNTRIES[0];
        if (timeZone.startsWith('Africa/Cairo')) return COUNTRIES.find(c => c.code === 'EG') || COUNTRIES[0];
        if (timeZone.startsWith('Africa/Lagos')) return COUNTRIES.find(c => c.code === 'NG') || COUNTRIES[0];

        // General Regional Fallbacks (Priority 2)
        if (timeZone.startsWith('America/')) return COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0];
    } catch (e) {
        console.warn('Country detection failed', e);
    }
    return COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0];
};

function PhoneInput({ name, required, className }: { name: string, required?: boolean, className?: string }) {
    const [selected, setSelected] = useState(COUNTRIES[0]);
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Auto-detect on mount
    useEffect(() => {
        const detected = getCountryFromTimezone();
        if (detected) setSelected(detected);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clean input: only digits
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        setValue(val);
    };

    // Normalized value for submission: +Code[Number without leading 0]
    const normalizedValue = selected.dial_code + value.replace(/^0+/, '');

    return (
        <div className={`relative flex gap-2 ${className}`}>
            {/* Hidden Input for Form Submission */}
            <input type="hidden" name={name} value={normalizedValue} />

            {/* Country Selector */}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="text-base">{selected.flag}</span>
                    <span className="text-muted-foreground text-xs">{selected.dial_code}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </button>

                {open && (
                    <div className="absolute top-full left-0 mt-1 w-[240px] max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50">
                        {COUNTRIES.map((c) => (
                            <button
                                key={c.code}
                                type="button"
                                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${selected.code === c.code ? 'bg-accent' : ''}`}
                                onClick={() => {
                                    setSelected(c);
                                    setOpen(false);
                                }}
                            >
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 text-left truncate">{c.name}</span>
                                <span className="text-muted-foreground text-xs">{c.dial_code}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Phone Number Input */}
            <Input
                type="tel"
                value={value}
                onChange={handleInput}
                placeholder="Phone Number"
                required={required}
                className="flex-1 text-sm"
            />
        </div>
    );
}



export function ChatWidget({
    theme = {},
    botName = 'Support Bot',
    welcomeMessage = 'Hello! How can I help you today?',
    clientId: _clientId,
    forcedDevice,
    logoUrl,
}: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [activeFlow, setActiveFlow] = useState<'lead' | 'booking' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { toast, toasts } = useToast();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Initialize Session ID
    // Note: Session recovery is handled in the hydration effect below.

    // Helper: Check for inactivity (6 hours = 21,600,000 ms)
    const checkInactivity = (storedData: { lastActivityAt?: number }) => {
        const NOW = Date.now();
        const MAX_INACTIVITY = 6 * 60 * 60 * 1000; // 6 hours

        if (storedData.lastActivityAt && (NOW - storedData.lastActivityAt > MAX_INACTIVITY)) {
            console.log('ChatWidget: Session expired due to inactivity. Resetting.');
            return true; // Expired
        }
        return false; // Active
    };

    // Hydrate from Local Storage on Mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const key = `TRM_CHAT_STORAGE_${_clientId || 'default'}`;

        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);

                // Check if expired
                if (checkInactivity(parsed)) {
                    // Expired: Start fresh
                    localStorage.removeItem(key);
                    setSessionId(crypto.randomUUID());
                } else {
                    // Active: Restore state
                    if (parsed.messages) setMessages(parsed.messages);
                    if (typeof parsed.isOpen === 'boolean') setIsOpen(parsed.isOpen);
                    if (parsed.sessionId) setSessionId(parsed.sessionId);
                    else setSessionId(crypto.randomUUID());
                }
            } else {
                setSessionId(crypto.randomUUID());
            }
        } catch (e) {
            console.error('Failed to load chat state', e);
            setSessionId(crypto.randomUUID());
        }
    }, [_clientId]);

    // Persist to Local Storage on Change
    useEffect(() => {
        if (typeof window === 'undefined' || !sessionId) return;
        const key = `TRM_CHAT_STORAGE_${_clientId || 'default'}`;

        const stateToSave = {
            messages,
            isOpen,
            sessionId,
            lastActivityAt: Date.now() // Update timestamp on any state change
        };

        try {
            localStorage.setItem(key, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save chat state', e);
        }
    }, [messages, isOpen, sessionId, _clientId]);

    // Re-check inactivity on Window Focus (e.g. user comes back to open tab next day)
    useEffect(() => {
        const handleFocus = () => {
            if (typeof window === 'undefined') return;
            const key = `TRM_CHAT_STORAGE_${_clientId || 'default'}`;
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (checkInactivity(parsed)) {
                        // Reset State in UI
                        setMessages([]);
                        setIsOpen(false);
                        setActiveFlow(null);
                        setSessionId(crypto.randomUUID());
                        // Note: Persistence effect will run after these state updates and save the new clean state
                    }
                }
            } catch (e) {
                console.error('Error checking inactivity on focus', e);
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [_clientId]);

    // Handle handling device-specific config
    const searchParams = useSearchParams();
    const [activeDevice, setActiveDevice] = useState<'mobile' | 'laptop' | 'desktop'>(
        forcedDevice || (searchParams?.get('device') as 'mobile' | 'laptop' | 'desktop') || 'desktop'
    );

    useEffect(() => {
        if (forcedDevice) {
            setActiveDevice(forcedDevice);
        }
    }, [forcedDevice]);

    // Listen for resize events from parent
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'TRM_HOST_RESIZE') {
                setActiveDevice(event.data.device);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle Modal signaling
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMsg = (e: MessageEvent) => {
            if (e.data?.type === 'TRM_HOST_FADE_OUT_REQUEST') {
                // Determine what to close based on priority
                if (activeFlow === 'booking') {
                    setActiveFlow(null);
                } else if (isOpen) {
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener('message', handleMsg);

        if (activeFlow === 'booking') {
            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_OPEN' }, '*');
        }

        return () => window.removeEventListener('message', handleMsg);
    }, [activeFlow, isOpen]);

    const getResponsiveConfig = () => {
        if (theme?.responsive?.[activeDevice]) {
            return theme.responsive[activeDevice];
        }
        return theme?.responsive?.desktop || {};
    };

    const config = getResponsiveConfig();

    // Style defaults
    const primary_color = theme.primary_color || '#000000';
    const header_color = theme.header_color || '#000000';
    const background_color = theme.background_color || '#ffffff';
    const text_color = theme.text_color || '#000000';
    const title_color = theme.title_color || '#ffffff';
    const bot_msg_color = theme.bot_msg_color || '#f3f4f6';
    const bot_msg_text_color = theme.bot_msg_text_color || '#000000';
    const booking_link = theme.booking_link || '';
    const link_color = theme.link_color || theme.primary_color || '#000000';

    const position = config.position || theme.position || 'bottom-right';
    const bottom_px = config.bottom_px ?? 20;
    const right_px = config.right_px ?? 20;
    const launcher_size = config.launcher_size_px ?? 60;
    const width_px = config.width_px ?? 350;
    const height_px = config.height_px ?? 500;

    const handleBookingClick = () => {
        setActiveFlow('booking');

        // Log booking intent
        fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: _clientId,
                sessionId: sessionId
            })
        }).catch(err => console.error('Failed to log booking:', err));
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    clientId: _clientId,
                    sessionId: sessionId
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();
            const botMsg: Message = {
                role: 'assistant',
                content: data.reply || data.message || 'Sorry, I am having trouble connecting right now.'
            };

            setMessages((prev) => [...prev, botMsg]);

            // Handle "Leave Message" trigger from n8n (Robust check)
            if (shouldTriggerLeadForm(data)) {
                console.log('Triggering Leave Message Action based on AI response:', data);
                botMsg.showLeaveMessageAction = true;
            }
        } catch (error) {
            console.error('Chat Error:', error);
            toast({
                title: "Error",
                description: "Failed to send.",
                className: "bg-zinc-800 text-white border-zinc-700 rounded-xl"
            });
            // Optional: Remove user message or show error state
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeadFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: _clientId,
                    ...data
                })
            });

            if (!response.ok) throw new Error('Failed to submit lead');

            setActiveFlow(null);
            setMessages(prev => [
                ...prev.filter(m => m.type !== 'lead_form'),
                { role: 'assistant', content: 'Thanks! We have received your message and will follow up shortly.' }
            ]);
            toast({
                title: "Success",
                description: "Leave Message Form Sent",
                duration: 3000,
            });
        } catch (error) {
            console.error('Lead Submit Error:', error);
            toast({
                title: "Error",
                description: "Failed to submit form. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isBooking = activeFlow === 'booking';
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [highlightClose, setHighlightClose] = useState(false);

    // Track interactions with the iframe
    useEffect(() => {
        if (!isBooking) {
            setHasInteracted(false);
            return;
        }

        const handleBlur = () => {
            // If focus shifts to the iframe, mark as interacted
            if (document.activeElement === iframeRef.current) {
                setHasInteracted(true);
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [isBooking]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget) return;

        if (hasInteracted) {
            // Visual cue that it's blocked
            setHighlightClose(true);
            setTimeout(() => setHighlightClose(false), 500);
        } else {
            // Close if no interaction
            setActiveFlow(null);
        }
    };

    const styles = {
        container: {
            position: forcedDevice ? 'absolute' as const : 'fixed' as const,
            bottom: `${bottom_px}px`,
            right: position === 'bottom-right' ? `${right_px}px` : undefined,
            left: position === 'bottom-left' ? `${right_px}px` : undefined,
            zIndex: 50,
        },
        window: {
            width: `${width_px}px`,
            height: `${height_px}px`,
            backgroundColor: background_color,
            color: text_color,
            marginBottom: '16px',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25), 0 10px 30px -5px rgb(0 0 0 / 0.5)', // Increased shadow
            borderRadius: '1rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column' as const,
        },
        header: {
            backgroundColor: header_color,
            color: title_color,
        },
        primary: {
            backgroundColor: primary_color,
            width: `${launcher_size}px`,
            height: `${launcher_size}px`,
        },
        bubbleUser: {
            backgroundColor: primary_color,
            color: '#ffffff',
        },
        bubbleHost: {
            backgroundColor: bot_msg_color,
            color: bot_msg_text_color,
        }
    };

    // Default to open in preview, but allow toggling
    useEffect(() => {
        if (forcedDevice) {
            setIsOpen(true);
        }
    }, [forcedDevice]);

    // Track if we should animate the window opening (skip on initial restore)
    const shouldAnimate = useRef(false);

    // Notify parent iframe about size changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (activeFlow === 'booking') {
            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_OPEN' }, '*');
        } else {
            // 1. Send normal resize update (safely ignored by widget.js if currently fullscreen)
            const message = {
                type: 'TRM_CHAT_RESIZE',
                isOpen,
                animate: shouldAnimate.current, // Tell host whether to animate this change
                config: {
                    width: width_px,
                    height: height_px,
                    launcherSize: launcher_size,
                    bottom: bottom_px,
                    right: right_px
                }
            };
            window.parent.postMessage(message, '*');

            // Enable animations for future updates
            // We set this slightly later to ensure the 'animate: false' message is processed first
            setTimeout(() => {
                shouldAnimate.current = true;
            }, 100);

            // 2. Synchronization:
            // We do NOT send TRM_CHAT_MODAL_CLOSE here. 
            // We rely on AnimatePresence's onExitComplete callback to trigger the close signal 
            // ONLY after the fade-out animation has physically finished and unmounted.
            // This guarantees zero visual overlap ("remnant" glitch).
        }
    }, [activeFlow, isOpen, width_px, height_px, launcher_size, bottom_px, right_px]);

    return (
        <ToastProvider>
            <div style={styles.container}>
                {/* Modal Overlay Layer */}
                <AnimatePresence
                    onExitComplete={() => {
                        // Handshake Step 3: Tell host we are invisible. Safe to resize now.
                        window.parent.postMessage({ type: 'TRM_IFRAME_FADE_OUT_DONE' }, '*');
                    }}
                >
                    {isBooking && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
                            onClick={handleBackdropClick}
                        >
                            {booking_link && (
                                <div
                                    className="relative bg-white w-[500px] h-[600px] max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            if (forcedDevice) setActiveFlow(null);
                                            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
                                        }}
                                        className={`absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-gray-100 z-10 transition-all duration-300 ${highlightClose ? 'ring-2 ring-red-500 scale-110 bg-red-50' : ''}`}
                                    >
                                        <X className={`h-4 w-4 ${highlightClose ? 'text-red-500' : 'text-gray-600'}`} />
                                    </button>
                                    <iframe
                                        ref={iframeRef}
                                        src={booking_link}
                                        className="w-full h-full border-0"
                                        title="Booking Calendar"
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Window Layer */}
                <AnimatePresence
                    onExitComplete={() => {
                        // Handshake Step 3: Tell host we are invisible. Safe to resize now.
                        window.parent.postMessage({ type: 'TRM_IFRAME_FADE_OUT_DONE' }, '*');
                    }}
                >
                    {isOpen && (
                        <motion.div
                            initial={shouldAnimate.current ? { opacity: 0, y: 20, scale: 0.9 } : false}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            style={styles.window}
                            className="absolute bottom-full right-0 origin-bottom-right"
                        >
                            {/* Inline Premium Toast */}
                            <ToastViewport className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] flex flex-col gap-2 z-50 focus:outline-none pointer-events-none p-0 m-0" />
                            {toasts.map(function ({ id, title, description, ...props }) {
                                return (
                                    <Toast
                                        key={id}
                                        {...props}
                                        className="bg-zinc-800 text-white border border-zinc-700 shadow-lg rounded-xl py-3 px-4 shadow-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full pointer-events-auto"
                                    >
                                        <div className="grid gap-1">
                                            {title && <ToastTitle className="text-xs font-bold">{title}</ToastTitle>}
                                            {description && (
                                                <ToastDescription className="text-xs opacity-90">{description}</ToastDescription>
                                            )}
                                        </div>
                                        <ToastClose className="text-zinc-400 hover:text-white" />
                                    </Toast>
                                )
                            })}
                            {/* Header */}
                            <div
                                className="flex items-center justify-between p-4 shrink-0"
                                style={styles.header}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/20 flex items-center justify-center font-bold" style={{ color: title_color }}>
                                        {logoUrl ? (
                                            <div className="relative h-full w-full overflow-hidden rounded-full border border-border/50">
                                                <img src={logoUrl} alt={botName} className="h-full w-full object-cover" />
                                            </div>
                                        ) : (
                                            botName.charAt(0)
                                        )}
                                    </div>
                                    <div style={{ color: title_color }}>
                                        <h3 className="font-semibold text-sm">{botName}</h3>
                                        <div className="flex items-center space-x-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <p className="text-xs opacity-90">Online</p>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white hover:bg-white/20"
                                    onClick={() => {
                                        if (forcedDevice) setIsOpen(false);
                                        window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: background_color }}>
                                {/* Welcome Message */}
                                <div className="flex justify-start flex-col space-y-2">
                                    <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm" style={styles.bubbleHost}>
                                        {welcomeMessage}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {booking_link && (
                                            <QuickActionButton
                                                label="Book Appointment"
                                                onClick={handleBookingClick}
                                                color={link_color}
                                                disabled={!!activeFlow}
                                            />
                                        )}
                                        <QuickActionButton
                                            label="Leave a message"
                                            onClick={() => {
                                                setActiveFlow('lead');
                                                setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'lead_form' }]);
                                            }}
                                            color={link_color}
                                            disabled={!!activeFlow}
                                        />
                                    </div>
                                </div>

                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                                        {msg.type === 'lead_form' ? (
                                            <div className="w-[90%] bg-white border rounded-xl p-4 shadow-sm" style={{ borderTopLeftRadius: 0 }}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-semibold text-sm">Leave a message</h4>
                                                    <button
                                                        onClick={() => {
                                                            setActiveFlow(null);
                                                            setMessages(prev => prev.filter((_, idx) => idx !== i));
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <form onSubmit={handleLeadFormSubmit} className="space-y-3">
                                                    <Input name="name" placeholder="Name *" required className="text-sm" />
                                                    <Input name="email" type="email" placeholder="Email" className="text-sm" />

                                                    <PhoneInput name="phone" required />
                                                    <textarea
                                                        name="message"
                                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="How can we help? *"
                                                        rows={3}
                                                        required
                                                    />
                                                    <Button type="submit" className="w-full h-9 text-xs" style={{ backgroundColor: primary_color }}>
                                                        Send Message
                                                    </Button>
                                                </form>
                                            </div>
                                        ) : (
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                                                style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleHost}
                                            >
                                                {msg.content}
                                                {msg.showLeaveMessageAction && (
                                                    <div className="mt-3">
                                                        <QuickActionButton
                                                            label="Leave a message"
                                                            onClick={() => {
                                                                setActiveFlow('lead');
                                                                setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'lead_form' }]);
                                                            }}
                                                            color={link_color}
                                                            disabled={!!activeFlow}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="rounded-2xl rounded-tl-none px-4 py-4 bg-gray-100 dark:bg-gray-800">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="border-t bg-white p-4 dark:bg-slate-900 shrink-0 relative">
                                {activeFlow === 'lead' && (
                                    <div
                                        className="absolute inset-0 z-10 bg-white/50 cursor-not-allowed"
                                        onClick={() => {
                                            toast({
                                                title: "Please complete the form",
                                                description: "You must submit or close the form before sending a new message.",
                                                variant: "destructive",
                                                duration: 2000,
                                            });
                                        }}
                                    />
                                )}
                                <form
                                    className="flex space-x-2"
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                >
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 rounded-full border-gray-200 dark:border-gray-700 focus-visible:ring-1"
                                        disabled={activeFlow === 'lead'}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="rounded-full h-10 w-10 shrink-0 transition-transform active:scale-95 hover:opacity-90"
                                        style={{ backgroundColor: primary_color }}
                                        disabled={isLoading || !input.trim() || activeFlow === 'lead'}
                                    >
                                        <Send className="h-4 w-4 text-white" />
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Launcher Button */}
                <div className="relative">
                    {/* Pulse Animation */}
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 z-50 pointer-events-none">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    )}

                    <motion.button
                        className="flex items-center justify-center rounded-full shadow-2xl hover:opacity-90 transition-shadow duration-300"
                        style={styles.primary}
                        onClick={() => {
                            if (isOpen) {
                                // Start Close Handshake
                                if (forcedDevice) setIsOpen(false);
                                window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
                            } else {
                                setIsOpen(true);
                            }
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {isOpen ? (
                                <motion.div
                                    key="close"
                                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <X className="h-7 w-7 text-white" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="open"
                                    initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <MessageCircle className="h-7 w-7 text-white" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </div>
        </ToastProvider >
    );
}

// Helper to robustly check for "Leave Message" flag
export function shouldTriggerLeadForm(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;

    const record = data as Record<string, unknown>;
    // Check various key casings
    const keys = ['Leave Message', 'leaveMessage', 'leave_message', 'LeaveMessage'];

    for (const key of keys) {
        const val = record[key];
        // Check for boolean true
        if (val === true) return true;
        // Check for string "true" (case-insensitive)
        if (typeof val === 'string' && val.toLowerCase() === 'true') return true;
    }

    return false;
}
