export class Language {
    shortcode: string;
    name: string;
    constructor(short: string, full: string) {
      this.shortcode = short;
      this.name = full;
      return this;
    }
}
export class Country {
    shortcode: string;
    name: string;
    mainLanguage: string;
    flag: any;
    constructor(short: string, name: string, flag: any, lang: string) {
      this.shortcode = short;
      this.name = name;
      this.flag = flag;
      this.mainLanguage = lang;
      return this;
    }
}
  
export let countries = new Array<Country>(
  new Country('AD', 'Andorra', discord.decor.Emojis.FLAG_AD, ''),
  new Country('AE', 'United Arab Emirates', discord.decor.Emojis.FLAG_AE, ''),
  new Country('AF', 'Afghanistan', discord.decor.Emojis.FLAG_AF, ''),
  new Country('AG', 'Antigua and Barbuda', discord.decor.Emojis.FLAG_AG, ''),
  new Country('AI', 'Anguilla', discord.decor.Emojis.FLAG_AI, ''),
  new Country('AL', 'Albania', discord.decor.Emojis.FLAG_AL, ''),
  new Country('AM', 'Armenia', discord.decor.Emojis.FLAG_AM, ''),
  new Country('AO', 'Angola', discord.decor.Emojis.FLAG_AO, ''),
  new Country('AQ', 'Antarctica', discord.decor.Emojis.FLAG_AQ, ''),
  new Country('AR', 'Argentina', discord.decor.Emojis.FLAG_AR, ''),
  new Country('AS', 'American Samoa', discord.decor.Emojis.FLAG_AS, ''),
  new Country('AT', 'Austria', discord.decor.Emojis.FLAG_AT, ''),
  new Country('AU', 'Australia', discord.decor.Emojis.FLAG_AU, ''),
  new Country('AW', 'Aruba', discord.decor.Emojis.FLAG_AW, ''),
  new Country('AX', 'Åland Islands', discord.decor.Emojis.FLAG_AX, ''),
  new Country('AZ', 'Azerbaijan', discord.decor.Emojis.FLAG_AZ, ''),
  new Country('BA', 'Bosnia and Herzegovina', discord.decor.Emojis.FLAG_BA, ''),
  new Country('BB', 'Barbados', discord.decor.Emojis.FLAG_BB, ''),
  new Country('BD', 'Bangladesh', discord.decor.Emojis.FLAG_BD, ''),
  new Country('BE', 'Belgium', discord.decor.Emojis.FLAG_BE, ''),
  new Country('BF', 'Burkina Faso', discord.decor.Emojis.FLAG_BF, ''),
  new Country('BG', 'Bulgaria', discord.decor.Emojis.FLAG_BG, ''),
  new Country('BH', 'Bahrain', discord.decor.Emojis.FLAG_BH, ''),
  new Country('BI', 'Burundi', discord.decor.Emojis.FLAG_BI, ''),
  new Country('BJ', 'Benin', discord.decor.Emojis.FLAG_BJ, ''),
  new Country('BL', 'Saint Barthélemy', discord.decor.Emojis.FLAG_BL, ''),
  new Country('BM', 'Bermuda', discord.decor.Emojis.FLAG_BM, ''),
  new Country('BN', 'Brunei Darussalam', discord.decor.Emojis.FLAG_BN, ''),
  new Country('BO', 'Bolivia', discord.decor.Emojis.FLAG_BO, ''),
  new Country(
    'BQ',
    'Bonaire, Sint Eustatius and Saba',
    discord.decor.Emojis.FLAG_BQ,
    ''
  ),
  new Country('BR', 'Brazil', discord.decor.Emojis.FLAG_BR, 'pt'),
  new Country('BS', 'Bahamas', discord.decor.Emojis.FLAG_BS, ''),
  new Country('BT', 'Bhutan', discord.decor.Emojis.FLAG_BT, ''),
  new Country('BV', 'Bouvet Island', discord.decor.Emojis.FLAG_BV, ''),
  new Country('BW', 'Botswana', discord.decor.Emojis.FLAG_BW, ''),
  new Country('BY', 'Belarus', discord.decor.Emojis.FLAG_BY, ''),
  new Country('BZ', 'Belize', discord.decor.Emojis.FLAG_BZ, ''),
  new Country('CA', 'Canada', discord.decor.Emojis.FLAG_CA, ''),
  new Country(
    'CC',
    'Cocos (Keeling) Islands',
    discord.decor.Emojis.FLAG_CC,
    ''
  ),
  new Country('CD', 'Congo', discord.decor.Emojis.FLAG_CD, ''),
  new Country(
    'CF',
    'Central African Republic',
    discord.decor.Emojis.FLAG_CF,
    ''
  ),
  new Country('CG', 'Congo', discord.decor.Emojis.FLAG_CG, ''),
  new Country('CH', 'Switzerland', discord.decor.Emojis.FLAG_CH, ''),
  new Country('CI', 'Côte D´Ivoire', discord.decor.Emojis.FLAG_CI, ''),
  new Country('CK', 'Cook Islands', discord.decor.Emojis.FLAG_CK, ''),
  new Country('CL', 'Chile', discord.decor.Emojis.FLAG_CL, ''),
  new Country('CM', 'Cameroon', discord.decor.Emojis.FLAG_CM, ''),
  new Country('CN', 'China', discord.decor.Emojis.FLAG_CN, ''),
  new Country('CO', 'Colombia', discord.decor.Emojis.FLAG_CO, ''),
  new Country('CR', 'Costa Rica', discord.decor.Emojis.FLAG_CR, ''),
  new Country('CU', 'Cuba', discord.decor.Emojis.FLAG_CU, ''),
  new Country('CV', 'Cape Verde', discord.decor.Emojis.FLAG_CV, ''),
  new Country('CW', 'Curaçao', discord.decor.Emojis.FLAG_CW, ''),
  new Country('CX', 'Christmas Island', discord.decor.Emojis.FLAG_CX, ''),
  new Country('CY', 'Cyprus', discord.decor.Emojis.FLAG_CY, ''),
  new Country('CZ', 'Czech Republic', discord.decor.Emojis.FLAG_CZ, ''),
  new Country('DE', 'Germany', discord.decor.Emojis.FLAG_DE, ''),
  new Country('DJ', 'Djibouti', discord.decor.Emojis.FLAG_DJ, ''),
  new Country('DK', 'Denmark', discord.decor.Emojis.FLAG_DK, ''),
  new Country('DM', 'Dominica', discord.decor.Emojis.FLAG_DM, ''),
  new Country('DO', 'Dominican Republic', discord.decor.Emojis.FLAG_DO, ''),
  new Country('DZ', 'Algeria', discord.decor.Emojis.FLAG_DZ, ''),
  new Country('EC', 'Ecuador', discord.decor.Emojis.FLAG_EC, ''),
  new Country('EE', 'Estonia', discord.decor.Emojis.FLAG_EE, ''),
  new Country('EG', 'Egypt', discord.decor.Emojis.FLAG_EG, ''),
  new Country('EH', 'Western Sahara', discord.decor.Emojis.FLAG_EH, ''),
  new Country('ER', 'Eritrea', discord.decor.Emojis.FLAG_ER, ''),
  new Country('ES', 'Spain', discord.decor.Emojis.FLAG_ES, ''),
  new Country('ET', 'Ethiopia', discord.decor.Emojis.FLAG_ET, ''),
  new Country('FI', 'Finland', discord.decor.Emojis.FLAG_FI, ''),
  new Country('FJ', 'Fiji', discord.decor.Emojis.FLAG_FJ, ''),
  new Country(
    'FK',
    'Falkland Islands (Malvinas)',
    discord.decor.Emojis.FLAG_FK,
    ''
  ),
  new Country('FM', 'Micronesia', discord.decor.Emojis.FLAG_FM, ''),
  new Country('FO', 'Faroe Islands', discord.decor.Emojis.FLAG_FO, ''),
  new Country('FR', 'France', discord.decor.Emojis.FLAG_FR, ''),
  new Country('GA', 'Gabon', discord.decor.Emojis.FLAG_GA, ''),
  new Country(
    'GB',
    'United Kingdom',
    [discord.decor.Emojis.FLAG_GB, discord.decor.Emojis.ENGLAND],
    ''
  ),
  new Country('GD', 'Grenada', discord.decor.Emojis.FLAG_GD, ''),
  new Country('GE', 'Georgia', discord.decor.Emojis.FLAG_GE, ''),
  new Country('GF', 'French Guiana', discord.decor.Emojis.FLAG_GF, ''),
  new Country('GG', 'Guernsey', discord.decor.Emojis.FLAG_GG, ''),
  new Country('GH', 'Ghana', discord.decor.Emojis.FLAG_GH, ''),
  new Country('GI', 'Gibraltar', discord.decor.Emojis.FLAG_GI, ''),
  new Country('GL', 'Greenland', discord.decor.Emojis.FLAG_GL, ''),
  new Country('GM', 'Gambia', discord.decor.Emojis.FLAG_GM, ''),
  new Country('GN', 'Guinea', discord.decor.Emojis.FLAG_GN, ''),
  new Country('GP', 'Guadeloupe', discord.decor.Emojis.FLAG_GP, ''),
  new Country('GQ', 'Equatorial Guinea', discord.decor.Emojis.FLAG_GQ, ''),
  new Country('GR', 'Greece', discord.decor.Emojis.FLAG_GR, ''),
  new Country('GS', 'South Georgia', discord.decor.Emojis.FLAG_GS, ''),
  new Country('GT', 'Guatemala', discord.decor.Emojis.FLAG_GT, ''),
  new Country('GU', 'Guam', discord.decor.Emojis.FLAG_GU, ''),
  new Country('GW', 'Guinea-Bissau', discord.decor.Emojis.FLAG_GW, ''),
  new Country('GY', 'Guyana', discord.decor.Emojis.FLAG_GY, ''),
  new Country('HK', 'Hong Kong', discord.decor.Emojis.FLAG_HK, ''),
  new Country(
    'HM',
    'Heard Island and Mcdonald Islands',
    discord.decor.Emojis.FLAG_HM,
    ''
  ),
  new Country('HN', 'Honduras', discord.decor.Emojis.FLAG_HN, ''),
  new Country('HR', 'Croatia', discord.decor.Emojis.FLAG_HR, ''),
  new Country('HT', 'Haiti', discord.decor.Emojis.FLAG_HT, ''),
  new Country('HU', 'Hungary', discord.decor.Emojis.FLAG_HU, ''),
  new Country('ID', 'Indonesia', discord.decor.Emojis.FLAG_ID, ''),
  new Country('IE', 'Ireland', discord.decor.Emojis.FLAG_IE, ''),
  new Country('IL', 'Israel', discord.decor.Emojis.FLAG_IL, ''),
  new Country('IM', 'Isle of Man', discord.decor.Emojis.FLAG_IM, ''),
  new Country('IN', 'India', discord.decor.Emojis.FLAG_IN, ''),
  new Country(
    'IO',
    'British Indian Ocean Territory',
    discord.decor.Emojis.FLAG_IO,
    ''
  ),
  new Country('IQ', 'Iraq', discord.decor.Emojis.FLAG_IQ, ''),
  new Country('IR', 'Iran', discord.decor.Emojis.FLAG_IR, ''),
  new Country('IS', 'Iceland', discord.decor.Emojis.FLAG_IS, ''),
  new Country('IT', 'Italy', discord.decor.Emojis.FLAG_IT, ''),
  new Country('JE', 'Jersey', discord.decor.Emojis.FLAG_JE, ''),
  new Country('JM', 'Jamaica', discord.decor.Emojis.FLAG_JM, ''),
  new Country('JO', 'Jordan', discord.decor.Emojis.FLAG_JO, ''),
  new Country('JP', 'Japan', discord.decor.Emojis.FLAG_JP, ''),
  new Country('KE', 'Kenya', discord.decor.Emojis.FLAG_KE, ''),
  new Country('KG', 'Kyrgyzstan', discord.decor.Emojis.FLAG_KG, ''),
  new Country('KH', 'Cambodia', discord.decor.Emojis.FLAG_KH, ''),
  new Country('KI', 'Kiribati', discord.decor.Emojis.FLAG_KI, ''),
  new Country('KM', 'Comoros', discord.decor.Emojis.FLAG_KM, ''),
  new Country('KN', 'Saint Kitts and Nevis', discord.decor.Emojis.FLAG_KN, ''),
  new Country('KP', 'North Korea', discord.decor.Emojis.FLAG_KP, ''),
  new Country('KR', 'South Korea', discord.decor.Emojis.FLAG_KR, ''),
  new Country('KW', 'Kuwait', discord.decor.Emojis.FLAG_KW, ''),
  new Country('KY', 'Cayman Islands', discord.decor.Emojis.FLAG_KY, ''),
  new Country('KZ', 'Kazakhstan', discord.decor.Emojis.FLAG_KZ, ''),
  new Country(
    'LA',
    'Lao People´s Democratic Republic',
    discord.decor.Emojis.FLAG_LA,
    ''
  ),
  new Country('LB', 'Lebanon', discord.decor.Emojis.FLAG_LB, ''),
  new Country('LC', 'Saint Lucia', discord.decor.Emojis.FLAG_LC, ''),
  new Country('LI', 'Liechtenstein', discord.decor.Emojis.FLAG_LI, ''),
  new Country('LK', 'Sri Lanka', discord.decor.Emojis.FLAG_LK, ''),
  new Country('LR', 'Liberia', discord.decor.Emojis.FLAG_LR, ''),
  new Country('LS', 'Lesotho', discord.decor.Emojis.FLAG_LS, ''),
  new Country('LT', 'Lithuania', discord.decor.Emojis.FLAG_LT, ''),
  new Country('LU', 'Luxembourg', discord.decor.Emojis.FLAG_LU, ''),
  new Country('LV', 'Latvia', discord.decor.Emojis.FLAG_LV, ''),
  new Country('LY', 'Libya', discord.decor.Emojis.FLAG_LY, ''),
  new Country('MA', 'Morocco', discord.decor.Emojis.FLAG_MA, ''),
  new Country('MC', 'Monaco', discord.decor.Emojis.FLAG_MC, ''),
  new Country('MD', 'Moldova', discord.decor.Emojis.FLAG_MD, ''),
  new Country('ME', 'Montenegro', discord.decor.Emojis.FLAG_ME, ''),
  new Country(
    'MF',
    'Saint Martin (French Part)',
    discord.decor.Emojis.FLAG_MF,
    ''
  ),
  new Country('MG', 'Madagascar', discord.decor.Emojis.FLAG_MG, ''),
  new Country('MH', 'Marshall Islands', discord.decor.Emojis.FLAG_MH, ''),
  new Country('MK', 'Macedonia', discord.decor.Emojis.FLAG_MK, ''),
  new Country('ML', 'Mali', discord.decor.Emojis.FLAG_ML, ''),
  new Country('MM', 'Myanmar', discord.decor.Emojis.FLAG_MM, ''),
  new Country('MN', 'Mongolia', discord.decor.Emojis.FLAG_MN, ''),
  new Country('MO', 'Macao', discord.decor.Emojis.FLAG_MO, ''),
  new Country(
    'MP',
    'Northern Mariana Islands',
    discord.decor.Emojis.FLAG_MP,
    ''
  ),
  new Country('MQ', 'Martinique', discord.decor.Emojis.FLAG_MQ, ''),
  new Country('MR', 'Mauritania', discord.decor.Emojis.FLAG_MR, ''),
  new Country('MS', 'Montserrat', discord.decor.Emojis.FLAG_MS, ''),
  new Country('MT', 'Malta', discord.decor.Emojis.FLAG_MT, ''),
  new Country('MU', 'Mauritius', discord.decor.Emojis.FLAG_MU, ''),
  new Country('MV', 'Maldives', discord.decor.Emojis.FLAG_MV, ''),
  new Country('MW', 'Malawi', discord.decor.Emojis.FLAG_MW, ''),
  new Country('MX', 'Mexico', discord.decor.Emojis.FLAG_MX, ''),
  new Country('MY', 'Malaysia', discord.decor.Emojis.FLAG_MY, ''),
  new Country('MZ', 'Mozambique', discord.decor.Emojis.FLAG_MZ, ''),
  new Country('NA', 'Namibia', discord.decor.Emojis.FLAG_NA, ''),
  new Country('NC', 'New Caledonia', discord.decor.Emojis.FLAG_NC, ''),
  new Country('NE', 'Niger', discord.decor.Emojis.FLAG_NE, ''),
  new Country('NF', 'Norfolk Island', discord.decor.Emojis.FLAG_NF, ''),
  new Country('NG', 'Nigeria', discord.decor.Emojis.FLAG_NG, ''),
  new Country('NI', 'Nicaragua', discord.decor.Emojis.FLAG_NI, ''),
  new Country('NL', 'Netherlands', discord.decor.Emojis.FLAG_NL, ''),
  new Country('NO', 'Norway', discord.decor.Emojis.FLAG_NO, ''),
  new Country('NP', 'Nepal', discord.decor.Emojis.FLAG_NP, ''),
  new Country('NR', 'Nauru', discord.decor.Emojis.FLAG_NR, ''),
  new Country('NU', 'Niue', discord.decor.Emojis.FLAG_NU, ''),
  new Country('NZ', 'New Zealand', discord.decor.Emojis.FLAG_NZ, ''),
  new Country('OM', 'Oman', discord.decor.Emojis.FLAG_OM, ''),
  new Country('PA', 'Panama', discord.decor.Emojis.FLAG_PA, ''),
  new Country('PE', 'Peru', discord.decor.Emojis.FLAG_PE, ''),
  new Country('PF', 'French Polynesia', discord.decor.Emojis.FLAG_PF, ''),
  new Country('PG', 'Papua New Guinea', discord.decor.Emojis.FLAG_PG, ''),
  new Country('PH', 'Philippines', discord.decor.Emojis.FLAG_PH, ''),
  new Country('PK', 'Pakistan', discord.decor.Emojis.FLAG_PK, ''),
  new Country('PL', 'Poland', discord.decor.Emojis.FLAG_PL, ''),
  new Country(
    'PM',
    'Saint Pierre and Miquelon',
    discord.decor.Emojis.FLAG_PM,
    ''
  ),
  new Country('PN', 'Pitcairn', discord.decor.Emojis.FLAG_PN, ''),
  new Country('PR', 'Puerto Rico', discord.decor.Emojis.FLAG_PR, ''),
  new Country('PS', 'Palestinian Territory', discord.decor.Emojis.FLAG_PS, ''),
  new Country('PT', 'Portugal', discord.decor.Emojis.FLAG_PT, 'pt'),
  new Country('PW', 'Palau', discord.decor.Emojis.FLAG_PW, ''),
  new Country('PY', 'Paraguay', discord.decor.Emojis.FLAG_PY, ''),
  new Country('QA', 'Qatar', discord.decor.Emojis.FLAG_QA, ''),
  new Country('RE', 'Réunion', discord.decor.Emojis.FLAG_RE, ''),
  new Country('RO', 'Romania', discord.decor.Emojis.FLAG_RO, ''),
  new Country('RS', 'Serbia', discord.decor.Emojis.FLAG_RS, ''),
  new Country('RU', 'Russia', discord.decor.Emojis.FLAG_RU, ''),
  new Country('RW', 'Rwanda', discord.decor.Emojis.FLAG_RW, ''),
  new Country('SA', 'Saudi Arabia', discord.decor.Emojis.FLAG_SA, ''),
  new Country('SB', 'Solomon Islands', discord.decor.Emojis.FLAG_SB, ''),
  new Country('SC', 'Seychelles', discord.decor.Emojis.FLAG_SC, ''),
  new Country('SD', 'Sudan', discord.decor.Emojis.FLAG_SD, ''),
  new Country('SE', 'Sweden', discord.decor.Emojis.FLAG_SE, ''),
  new Country('SG', 'Singapore', discord.decor.Emojis.FLAG_SG, ''),
  new Country(
    'SH',
    'Saint Helena, Ascension and Tristan Da Cunha',
    discord.decor.Emojis.FLAG_SH,
    ''
  ),
  new Country('SI', 'Slovenia', discord.decor.Emojis.FLAG_SI, ''),
  new Country('SJ', 'Svalbard and Jan Mayen', discord.decor.Emojis.FLAG_SJ, ''),
  new Country('SK', 'Slovakia', discord.decor.Emojis.FLAG_SK, ''),
  new Country('SL', 'Sierra Leone', discord.decor.Emojis.FLAG_SL, ''),
  new Country('SM', 'San Marino', discord.decor.Emojis.FLAG_SM, ''),
  new Country('SN', 'Senegal', discord.decor.Emojis.FLAG_SN, ''),
  new Country('SO', 'Somalia', discord.decor.Emojis.FLAG_SO, ''),
  new Country('SR', 'Suriname', discord.decor.Emojis.FLAG_SR, ''),
  new Country('SS', 'South Sudan', discord.decor.Emojis.FLAG_SS, ''),
  new Country('ST', 'Sao Tome and Principe', discord.decor.Emojis.FLAG_ST, ''),
  new Country('SV', 'El Salvador', discord.decor.Emojis.FLAG_SV, ''),
  new Country(
    'SX',
    'Sint Maarten (Dutch Part)',
    discord.decor.Emojis.FLAG_SX,
    ''
  ),
  new Country('SY', 'Syrian Arab Republic', discord.decor.Emojis.FLAG_SY, ''),
  new Country('SZ', 'Swaziland', discord.decor.Emojis.FLAG_SZ, ''),
  new Country(
    'TC',
    'Turks and Caicos Islands',
    discord.decor.Emojis.FLAG_TC,
    ''
  ),
  new Country('TD', 'Chad', discord.decor.Emojis.FLAG_TD, ''),
  new Country(
    'TF',
    'French Southern Territories',
    discord.decor.Emojis.FLAG_TF,
    ''
  ),
  new Country('TG', 'Togo', discord.decor.Emojis.FLAG_TG, ''),
  new Country('TH', 'Thailand', discord.decor.Emojis.FLAG_TH, ''),
  new Country('TJ', 'Tajikistan', discord.decor.Emojis.FLAG_TJ, ''),
  new Country('TK', 'Tokelau', discord.decor.Emojis.FLAG_TK, ''),
  new Country('TL', 'Timor-Leste', discord.decor.Emojis.FLAG_TL, ''),
  new Country('TM', 'Turkmenistan', discord.decor.Emojis.FLAG_TM, ''),
  new Country('TN', 'Tunisia', discord.decor.Emojis.FLAG_TN, ''),
  new Country('TO', 'Tonga', discord.decor.Emojis.FLAG_TO, ''),
  new Country('TR', 'Turkey', discord.decor.Emojis.FLAG_TR, ''),
  new Country('TT', 'Trinidad and Tobago', discord.decor.Emojis.FLAG_TT, ''),
  new Country('TV', 'Tuvalu', discord.decor.Emojis.FLAG_TV, ''),
  new Country('TW', 'Taiwan', discord.decor.Emojis.FLAG_TW, ''),
  new Country('TZ', 'Tanzania', discord.decor.Emojis.FLAG_TZ, ''),
  new Country('UA', 'Ukraine', discord.decor.Emojis.FLAG_UA, ''),
  new Country('UG', 'Uganda', discord.decor.Emojis.FLAG_UG, ''),
  new Country(
    'UM',
    'United States Minor Outlying Islands',
    discord.decor.Emojis.FLAG_UM,
    ''
  ),
  new Country('US', 'United States', discord.decor.Emojis.FLAG_US, ''),
  new Country('UY', 'Uruguay', discord.decor.Emojis.FLAG_UY, ''),
  new Country('UZ', 'Uzbekistan', discord.decor.Emojis.FLAG_UZ, ''),
  new Country('VA', 'Vatican City', discord.decor.Emojis.FLAG_VA, ''),
  new Country(
    'VC',
    'Saint Vincent and The Grenadines',
    discord.decor.Emojis.FLAG_VC,
    ''
  ),
  new Country('VE', 'Venezuela', discord.decor.Emojis.FLAG_VE, ''),
  new Country(
    'VG',
    'Virgin Islands, British',
    discord.decor.Emojis.FLAG_VG,
    ''
  ),
  new Country('VI', 'Virgin Islands, U.S.', discord.decor.Emojis.FLAG_VI, ''),
  new Country('VN', 'Viet Nam', discord.decor.Emojis.FLAG_VN, ''),
  new Country('VU', 'Vanuatu', discord.decor.Emojis.FLAG_VU, ''),
  new Country('WF', 'Wallis and Futuna', discord.decor.Emojis.FLAG_WF, ''),
  new Country('WS', 'Samoa', discord.decor.Emojis.FLAG_WS, ''),
  new Country('YE', 'Yemen', discord.decor.Emojis.FLAG_YE, ''),
  new Country('YT', 'Mayotte', discord.decor.Emojis.FLAG_YT, ''),
  new Country('ZA', 'South Africa', discord.decor.Emojis.FLAG_ZA, ''),
  new Country('ZM', 'Zambia', discord.decor.Emojis.FLAG_ZM, ''),
  new Country('ZW', 'Zimbabwe', discord.decor.Emojis.FLAG_ZW, '')
);
  
const langJson = `[{"English": "Afar", "alpha2": "aa"},{"English": "Abkhazian", "alpha2": "ab"},{"English": "Avestan", "alpha2": "ae"},{"English": "Afrikaans", "alpha2": "af"},{"English": "Akan", "alpha2": "ak"},{"English": "Amharic", "alpha2": "am"},{"English": "Aragonese", "alpha2": "an"},{"English": "Arabic", "alpha2": "ar"},{"English": "Assamese", "alpha2": "as"},{"English": "Avaric", "alpha2": "av"},{"English": "Aymara", "alpha2": "ay"},{"English": "Azerbaijani", "alpha2": "az"},{"English": "Bashkir", "alpha2": "ba"},{"English": "Belarusian", "alpha2": "be"},{"English": "Bulgarian", "alpha2": "bg"},{"English": "Bihari languages", "alpha2": "bh"},{"English": "Bislama", "alpha2": "bi"},{"English": "Bambara", "alpha2": "bm"},{"English": "Bengali", "alpha2": "bn"},{"English": "Tibetan", "alpha2": "bo"},{"English": "Breton", "alpha2": "br"},{"English": "Bosnian", "alpha2": "bs"},{"English": "Catalan; Valencian", "alpha2": "ca"},{"English": "Chechen", "alpha2": "ce"},{"English": "Chamorro", "alpha2": "ch"},{"English": "Corsican", "alpha2": "co"},{"English": "Cree", "alpha2": "cr"},{"English": "Czech", "alpha2": "cs"},{"English": "Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic", "alpha2": "cu"},{"English": "Chuvash", "alpha2": "cv"},{"English": "Welsh", "alpha2": "cy"},{"English": "Danish", "alpha2": "da"},{"English": "German", "alpha2": "de"},{"English": "Divehi; Dhivehi; Maldivian", "alpha2": "dv"},{"English": "Dzongkha", "alpha2": "dz"},{"English": "Ewe", "alpha2": "ee"},{"English": "Greek, Modern (1453-)", "alpha2": "el"},{"English": "English", "alpha2": "en"},{"English": "Esperanto", "alpha2": "eo"},{"English": "Spanish; Castilian", "alpha2": "es"},{"English": "Estonian", "alpha2": "et"},{"English": "Basque", "alpha2": "eu"},{"English": "Persian", "alpha2": "fa"},{"English": "Fulah", "alpha2": "ff"},{"English": "Finnish", "alpha2": "fi"},{"English": "Fijian", "alpha2": "fj"},{"English": "Faroese", "alpha2": "fo"},{"English": "French", "alpha2": "fr"},{"English": "Western Frisian", "alpha2": "fy"},{"English": "Irish", "alpha2": "ga"},{"English": "Gaelic; Scottish Gaelic", "alpha2": "gd"},{"English": "Galician", "alpha2": "gl"},{"English": "Guarani", "alpha2": "gn"},{"English": "Gujarati", "alpha2": "gu"},{"English": "Manx", "alpha2": "gv"},{"English": "Hausa", "alpha2": "ha"},{"English": "Hebrew", "alpha2": "he"},{"English": "Hindi", "alpha2": "hi"},{"English": "Hiri Motu", "alpha2": "ho"},{"English": "Croatian", "alpha2": "hr"},{"English": "Haitian; Haitian Creole", "alpha2": "ht"},{"English": "Hungarian", "alpha2": "hu"},{"English": "Armenian", "alpha2": "hy"},{"English": "Herero", "alpha2": "hz"},{"English": "Interlingua (International Auxiliary Language Association)", "alpha2": "ia"},{"English": "Indonesian", "alpha2": "id"},{"English": "Interlingue; Occidental", "alpha2": "ie"},{"English": "Igbo", "alpha2": "ig"},{"English": "Sichuan Yi; Nuosu", "alpha2": "ii"},{"English": "Inupiaq", "alpha2": "ik"},{"English": "Ido", "alpha2": "io"},{"English": "Icelandic", "alpha2": "is"},{"English": "Italian", "alpha2": "it"},{"English": "Inuktitut", "alpha2": "iu"},{"English": "Japanese", "alpha2": "ja"},{"English": "Javanese", "alpha2": "jv"},{"English": "Georgian", "alpha2": "ka"},{"English": "Kongo", "alpha2": "kg"},{"English": "Kikuyu; Gikuyu", "alpha2": "ki"},{"English": "Kuanyama; Kwanyama", "alpha2": "kj"},{"English": "Kazakh", "alpha2": "kk"},{"English": "Kalaallisut; Greenlandic", "alpha2": "kl"},{"English": "Central Khmer", "alpha2": "km"},{"English": "Kannada", "alpha2": "kn"},{"English": "Korean", "alpha2": "ko"},{"English": "Kanuri", "alpha2": "kr"},{"English": "Kashmiri", "alpha2": "ks"},{"English": "Kurdish", "alpha2": "ku"},{"English": "Komi", "alpha2": "kv"},{"English": "Cornish", "alpha2": "kw"},{"English": "Kirghiz; Kyrgyz", "alpha2": "ky"},{"English": "Latin", "alpha2": "la"},{"English": "Luxembourgish; Letzeburgesch", "alpha2": "lb"},{"English": "Ganda", "alpha2": "lg"},{"English": "Limburgan; Limburger; Limburgish", "alpha2": "li"},{"English": "Lingala", "alpha2": "ln"},{"English": "Lao", "alpha2": "lo"},{"English": "Lithuanian", "alpha2": "lt"},{"English": "Luba-Katanga", "alpha2": "lu"},{"English": "Latvian", "alpha2": "lv"},{"English": "Malagasy", "alpha2": "mg"},{"English": "Marshallese", "alpha2": "mh"},{"English": "Maori", "alpha2": "mi"},{"English": "Macedonian", "alpha2": "mk"},{"English": "Malayalam", "alpha2": "ml"},{"English": "Mongolian", "alpha2": "mn"},{"English": "Marathi", "alpha2": "mr"},{"English": "Malay", "alpha2": "ms"},{"English": "Maltese", "alpha2": "mt"},{"English": "Burmese", "alpha2": "my"},{"English": "Nauru", "alpha2": "na"},{"English": "Bokm\u00e5l, Norwegian; Norwegian Bokm\u00e5l", "alpha2": "nb"},{"English": "Ndebele, North; North Ndebele", "alpha2": "nd"},{"English": "Nepali", "alpha2": "ne"},{"English": "Ndonga", "alpha2": "ng"},{"English": "Dutch; Flemish", "alpha2": "nl"},{"English": "Norwegian Nynorsk; Nynorsk, Norwegian", "alpha2": "nn"},{"English": "Norwegian", "alpha2": "no"},{"English": "Ndebele, South; South Ndebele", "alpha2": "nr"},{"English": "Navajo; Navaho", "alpha2": "nv"},{"English": "Chichewa; Chewa; Nyanja", "alpha2": "ny"},{"English": "Occitan (post 1500)", "alpha2": "oc"},{"English": "Ojibwa", "alpha2": "oj"},{"English": "Oromo", "alpha2": "om"},{"English": "Oriya", "alpha2": "or"},{"English": "Ossetian; Ossetic", "alpha2": "os"},{"English": "Panjabi; Punjabi", "alpha2": "pa"},{"English": "Pali", "alpha2": "pi"},{"English": "Polish", "alpha2": "pl"},{"English": "Pushto; Pashto", "alpha2": "ps"},{"English": "Portuguese", "alpha2": "pt"},{"English": "Quechua", "alpha2": "qu"},{"English": "Romansh", "alpha2": "rm"},{"English": "Rundi", "alpha2": "rn"},{"English": "Romanian; Moldavian; Moldovan", "alpha2": "ro"},{"English": "Russian", "alpha2": "ru"},{"English": "Kinyarwanda", "alpha2": "rw"},{"English": "Sanskrit", "alpha2": "sa"},{"English": "Sardinian", "alpha2": "sc"},{"English": "Sindhi", "alpha2": "sd"},{"English": "Northern Sami", "alpha2": "se"},{"English": "Sango", "alpha2": "sg"},{"English": "Sinhala; Sinhalese", "alpha2": "si"},{"English": "Slovak", "alpha2": "sk"},{"English": "Slovenian", "alpha2": "sl"},{"English": "Samoan", "alpha2": "sm"},{"English": "Shona", "alpha2": "sn"},{"English": "Somali", "alpha2": "so"},{"English": "Albanian", "alpha2": "sq"},{"English": "Serbian", "alpha2": "sr"},{"English": "Swati", "alpha2": "ss"},{"English": "Sotho, Southern", "alpha2": "st"},{"English": "Sundanese", "alpha2": "su"},{"English": "Swedish", "alpha2": "sv"},{"English": "Swahili", "alpha2": "sw"},{"English": "Tamil", "alpha2": "ta"},{"English": "Telugu", "alpha2": "te"},{"English": "Tajik", "alpha2": "tg"},{"English": "Thai", "alpha2": "th"},{"English": "Tigrinya", "alpha2": "ti"},{"English": "Turkmen", "alpha2": "tk"},{"English": "Tagalog", "alpha2": "tl"},{"English": "Tswana", "alpha2": "tn"},{"English": "Tonga (Tonga Islands)", "alpha2": "to"},{"English": "Turkish", "alpha2": "tr"},{"English": "Tsonga", "alpha2": "ts"},{"English": "Tatar", "alpha2": "tt"},{"English": "Twi", "alpha2": "tw"},{"English": "Tahitian", "alpha2": "ty"},{"English": "Uighur; Uyghur", "alpha2": "ug"},{"English": "Ukrainian", "alpha2": "uk"},{"English": "Urdu", "alpha2": "ur"},{"English": "Uzbek", "alpha2": "uz"},{"English": "Venda", "alpha2": "ve"},{"English": "Vietnamese", "alpha2": "vi"},{"English": "Volap\u00fck", "alpha2": "vo"},{"English": "Walloon", "alpha2": "wa"},{"English": "Wolof", "alpha2": "wo"},{"English": "Xhosa", "alpha2": "xh"},{"English": "Yiddish", "alpha2": "yi"},{"English": "Yoruba", "alpha2": "yo"},{"English": "Zhuang; Chuang", "alpha2": "za"},{"English": "Chinese", "alpha2": "zh-TW"},{"English": "Chinese (Simplified)", "alpha2": "zh-CN"},{"English": "Zulu", "alpha2": "zu"}]`;
const langs = JSON.parse(langJson);
export let languages = new Array<Language>();
langs.forEach(function(ll: any) {
  let engname = ll.English;
  if (engname.indexOf(';') > -1) {
    engname = engname.split(';')[0];
  }
  //const alpha2 = ll.alpha2.split(',')[0].split('-')[0];
  const newobj = new Language(ll.alpha2, engname);
  languages.push(newobj);
});
  
const languageTagsJson = `[{"ISO3166-1-Alpha-2":"TW","Languages":"zh-TW,zh,nan,hak"},{"ISO3166-1-Alpha-2":"AF","Languages":"fa-AF,ps,uz-AF,tk"},{"ISO3166-1-Alpha-2":"AL","Languages":"sq,el"},{"ISO3166-1-Alpha-2":"DZ","Languages":"ar-DZ"},{"ISO3166-1-Alpha-2":"AS","Languages":"en-AS,sm,to"},{"ISO3166-1-Alpha-2":"AD","Languages":"ca"},{"ISO3166-1-Alpha-2":"AO","Languages":"pt-AO"},{"ISO3166-1-Alpha-2":"AI","Languages":"en-AI"},{"ISO3166-1-Alpha-2":"AQ","Languages":null},{"ISO3166-1-Alpha-2":"AG","Languages":"en-AG"},{"ISO3166-1-Alpha-2":"AR","Languages":"es-AR,en,it,de,fr,gn"},{"ISO3166-1-Alpha-2":"AM","Languages":"hy"},{"ISO3166-1-Alpha-2":"AW","Languages":"nl-AW,es,en"},{"ISO3166-1-Alpha-2":"AU","Languages":"en-AU"},{"ISO3166-1-Alpha-2":"AT","Languages":"de-AT,hr,hu,sl"},{"ISO3166-1-Alpha-2":"AZ","Languages":"az,ru,hy"},{"ISO3166-1-Alpha-2":"BS","Languages":"en-BS"},{"ISO3166-1-Alpha-2":"BH","Languages":"ar-BH,en,fa,ur"},{"ISO3166-1-Alpha-2":"BD","Languages":"bn-BD,en"},{"ISO3166-1-Alpha-2":"BB","Languages":"en-BB"},{"ISO3166-1-Alpha-2":"BY","Languages":"be,ru"},{"ISO3166-1-Alpha-2":"BE","Languages":"nl-BE,fr-BE,de-BE"},{"ISO3166-1-Alpha-2":"BZ","Languages":"en-BZ,es"},{"ISO3166-1-Alpha-2":"BJ","Languages":"fr-BJ"},{"ISO3166-1-Alpha-2":"BM","Languages":"en-BM,pt"},{"ISO3166-1-Alpha-2":"BT","Languages":"dz"},{"ISO3166-1-Alpha-2":"BO","Languages":"es-BO,qu,ay"},{"ISO3166-1-Alpha-2":"BQ","Languages":"nl,pap,en"},{"ISO3166-1-Alpha-2":"BA","Languages":"bs,hr-BA,sr-BA"},{"ISO3166-1-Alpha-2":"BW","Languages":"en-BW,tn-BW"},{"ISO3166-1-Alpha-2":"BV","Languages":null},{"ISO3166-1-Alpha-2":"BR","Languages":"pt-BR,es,en,fr"},{"ISO3166-1-Alpha-2":"IO","Languages":"en-IO"},{"ISO3166-1-Alpha-2":"VG","Languages":"en-VG"},{"ISO3166-1-Alpha-2":"BN","Languages":"ms-BN,en-BN"},{"ISO3166-1-Alpha-2":"BG","Languages":"bg,tr-BG,rom"},{"ISO3166-1-Alpha-2":"BF","Languages":"fr-BF"},{"ISO3166-1-Alpha-2":"BI","Languages":"fr-BI,rn"},{"ISO3166-1-Alpha-2":"CV","Languages":"pt-CV"},{"ISO3166-1-Alpha-2":"KH","Languages":"km,fr,en"},{"ISO3166-1-Alpha-2":"CM","Languages":"en-CM,fr-CM"},{"ISO3166-1-Alpha-2":"CA","Languages":"en-CA,fr-CA,iu"},{"ISO3166-1-Alpha-2":"KY","Languages":"en-KY"},{"ISO3166-1-Alpha-2":"CF","Languages":"fr-CF,sg,ln,kg"},{"ISO3166-1-Alpha-2":"TD","Languages":"fr-TD,ar-TD,sre"},{"ISO3166-1-Alpha-2":"CL","Languages":"es-CL"},{"ISO3166-1-Alpha-2":"CN","Languages":"zh-CN,yue,wuu,dta,ug,za"},{"ISO3166-1-Alpha-2":"HK","Languages":"zh-HK,yue,zh,en"},{"ISO3166-1-Alpha-2":"MO","Languages":"zh,zh-MO,pt"},{"ISO3166-1-Alpha-2":"CX","Languages":"en,zh,ms-CC"},{"ISO3166-1-Alpha-2":"CC","Languages":"ms-CC,en"},{"ISO3166-1-Alpha-2":"CO","Languages":"es-CO"},{"ISO3166-1-Alpha-2":"KM","Languages":"ar,fr-KM"},{"ISO3166-1-Alpha-2":"CG","Languages":"fr-CG,kg,ln-CG"},{"ISO3166-1-Alpha-2":"CK","Languages":"en-CK,mi"},{"ISO3166-1-Alpha-2":"CR","Languages":"es-CR,en"},{"ISO3166-1-Alpha-2":"HR","Languages":"hr-HR,sr"},{"ISO3166-1-Alpha-2":"CU","Languages":"es-CU"},{"ISO3166-1-Alpha-2":"CW","Languages":"nl,pap"},{"ISO3166-1-Alpha-2":"CY","Languages":"el-CY,tr-CY,en"},{"ISO3166-1-Alpha-2":"CZ","Languages":"cs,sk"},{"ISO3166-1-Alpha-2":"CI","Languages":"fr-CI"},{"ISO3166-1-Alpha-2":"KP","Languages":"ko-KP"},{"ISO3166-1-Alpha-2":"CD","Languages":"fr-CD,ln,kg"},{"ISO3166-1-Alpha-2":"DK","Languages":"da-DK,en,fo,de-DK"},{"ISO3166-1-Alpha-2":"DJ","Languages":"fr-DJ,ar,so-DJ,aa"},{"ISO3166-1-Alpha-2":"DM","Languages":"en-DM"},{"ISO3166-1-Alpha-2":"DO","Languages":"es-DO"},{"ISO3166-1-Alpha-2":"EC","Languages":"es-EC"},{"ISO3166-1-Alpha-2":"EG","Languages":"ar-EG,en,fr"},{"ISO3166-1-Alpha-2":"SV","Languages":"es-SV"},{"ISO3166-1-Alpha-2":"GQ","Languages":"es-GQ,fr"},{"ISO3166-1-Alpha-2":"ER","Languages":"aa-ER,ar,tig,kun,ti-ER"},{"ISO3166-1-Alpha-2":"EE","Languages":"et,ru"},{"ISO3166-1-Alpha-2":"ET","Languages":"am,en-ET,om-ET,ti-ET,so-ET,sid"},{"ISO3166-1-Alpha-2":"FK","Languages":"en-FK"},{"ISO3166-1-Alpha-2":"FO","Languages":"fo,da-FO"},{"ISO3166-1-Alpha-2":"FJ","Languages":"en-FJ,fj"},{"ISO3166-1-Alpha-2":"FI","Languages":"fi-FI,sv-FI,smn"},{"ISO3166-1-Alpha-2":"FR","Languages":"fr-FR,frp,br,co,ca,eu,oc"},{"ISO3166-1-Alpha-2":"GF","Languages":"fr-GF"},{"ISO3166-1-Alpha-2":"PF","Languages":"fr-PF,ty"},{"ISO3166-1-Alpha-2":"TF","Languages":"fr"},{"ISO3166-1-Alpha-2":"GA","Languages":"fr-GA"},{"ISO3166-1-Alpha-2":"GM","Languages":"en-GM,mnk,wof,wo,ff"},{"ISO3166-1-Alpha-2":"GE","Languages":"ka,ru,hy,az"},{"ISO3166-1-Alpha-2":"DE","Languages":"de"},{"ISO3166-1-Alpha-2":"GH","Languages":"en-GH,ak,ee,tw"},{"ISO3166-1-Alpha-2":"GI","Languages":"en-GI,es,it,pt"},{"ISO3166-1-Alpha-2":"GR","Languages":"el-GR,en,fr"},{"ISO3166-1-Alpha-2":"GL","Languages":"kl,da-GL,en"},{"ISO3166-1-Alpha-2":"GD","Languages":"en-GD"},{"ISO3166-1-Alpha-2":"GP","Languages":"fr-GP"},{"ISO3166-1-Alpha-2":"GU","Languages":"en-GU,ch-GU"},{"ISO3166-1-Alpha-2":"GT","Languages":"es-GT"},{"ISO3166-1-Alpha-2":"GG","Languages":"en,fr"},{"ISO3166-1-Alpha-2":"GN","Languages":"fr-GN"},{"ISO3166-1-Alpha-2":"GW","Languages":"pt-GW,pov"},{"ISO3166-1-Alpha-2":"GY","Languages":"en-GY"},{"ISO3166-1-Alpha-2":"HT","Languages":"ht,fr-HT"},{"ISO3166-1-Alpha-2":"HM","Languages":null},{"ISO3166-1-Alpha-2":"VA","Languages":"la,it,fr"},{"ISO3166-1-Alpha-2":"HN","Languages":"es-HN"},{"ISO3166-1-Alpha-2":"HU","Languages":"hu-HU"},{"ISO3166-1-Alpha-2":"IS","Languages":"is,en,de,da,sv,no"},{"ISO3166-1-Alpha-2":"IN","Languages":"en-IN,hi,bn,te,mr,ta,ur,gu,kn,ml,or,pa,as,bh,sat,ks,ne,sd,kok,doi,mni,sit,sa,fr,lus,inc"},{"ISO3166-1-Alpha-2":"ID","Languages":"id,en,nl,jv"},{"ISO3166-1-Alpha-2":"IR","Languages":"fa-IR,ku"},{"ISO3166-1-Alpha-2":"IQ","Languages":"ar-IQ,ku,hy"},{"ISO3166-1-Alpha-2":"IE","Languages":"en-IE,ga-IE"},{"ISO3166-1-Alpha-2":"IM","Languages":"en,gv"},{"ISO3166-1-Alpha-2":"IL","Languages":"he,ar-IL,en-IL,"},{"ISO3166-1-Alpha-2":"IT","Languages":"it-IT,de-IT,fr-IT,sc,ca,co,sl"},{"ISO3166-1-Alpha-2":"JM","Languages":"en-JM"},{"ISO3166-1-Alpha-2":"JP","Languages":"ja"},{"ISO3166-1-Alpha-2":"JE","Languages":"en,pt"},{"ISO3166-1-Alpha-2":"JO","Languages":"ar-JO,en"},{"ISO3166-1-Alpha-2":"KZ","Languages":"kk,ru"},{"ISO3166-1-Alpha-2":"KE","Languages":"en-KE,sw-KE"},{"ISO3166-1-Alpha-2":"KI","Languages":"en-KI,gil"},{"ISO3166-1-Alpha-2":"KW","Languages":"ar-KW,en"},{"ISO3166-1-Alpha-2":"KG","Languages":"ky,uz,ru"},{"ISO3166-1-Alpha-2":"LA","Languages":"lo,fr,en"},{"ISO3166-1-Alpha-2":"LV","Languages":"lv,ru,lt"},{"ISO3166-1-Alpha-2":"LB","Languages":"ar-LB,fr-LB,en,hy"},{"ISO3166-1-Alpha-2":"LS","Languages":"en-LS,st,zu,xh"},{"ISO3166-1-Alpha-2":"LR","Languages":"en-LR"},{"ISO3166-1-Alpha-2":"LY","Languages":"ar-LY,it,en"},{"ISO3166-1-Alpha-2":"LI","Languages":"de-LI"},{"ISO3166-1-Alpha-2":"LT","Languages":"lt,ru,pl"},{"ISO3166-1-Alpha-2":"LU","Languages":"lb,de-LU,fr-LU"},{"ISO3166-1-Alpha-2":"MG","Languages":"fr-MG,mg"},{"ISO3166-1-Alpha-2":"MW","Languages":"ny,yao,tum,swk"},{"ISO3166-1-Alpha-2":"MY","Languages":"ms-MY,en,zh,ta,te,ml,pa,th"},{"ISO3166-1-Alpha-2":"MV","Languages":"dv,en"},{"ISO3166-1-Alpha-2":"ML","Languages":"fr-ML,bm"},{"ISO3166-1-Alpha-2":"MT","Languages":"mt,en-MT"},{"ISO3166-1-Alpha-2":"MH","Languages":"mh,en-MH"},{"ISO3166-1-Alpha-2":"MQ","Languages":"fr-MQ"},{"ISO3166-1-Alpha-2":"MR","Languages":"ar-MR,fuc,snk,fr,mey,wo"},{"ISO3166-1-Alpha-2":"MU","Languages":"en-MU,bho,fr"},{"ISO3166-1-Alpha-2":"YT","Languages":"fr-YT"},{"ISO3166-1-Alpha-2":"MX","Languages":"es-MX"},{"ISO3166-1-Alpha-2":"FM","Languages":"en-FM,chk,pon,yap,kos,uli,woe,nkr,kpg"},{"ISO3166-1-Alpha-2":"MC","Languages":"fr-MC,en,it"},{"ISO3166-1-Alpha-2":"MN","Languages":"mn,ru"},{"ISO3166-1-Alpha-2":"ME","Languages":"sr,hu,bs,sq,hr,rom"},{"ISO3166-1-Alpha-2":"MS","Languages":"en-MS"},{"ISO3166-1-Alpha-2":"MA","Languages":"ar-MA,ber,fr"},{"ISO3166-1-Alpha-2":"MZ","Languages":"pt-MZ,vmw"},{"ISO3166-1-Alpha-2":"MM","Languages":"my"},{"ISO3166-1-Alpha-2":"NA","Languages":"en-NA,af,de,hz,naq"},{"ISO3166-1-Alpha-2":"NR","Languages":"na,en-NR"},{"ISO3166-1-Alpha-2":"NP","Languages":"ne,en"},{"ISO3166-1-Alpha-2":"NL","Languages":"nl-NL,fy-NL"},{"ISO3166-1-Alpha-2":"NC","Languages":"fr-NC"},{"ISO3166-1-Alpha-2":"NZ","Languages":"en-NZ,mi"},{"ISO3166-1-Alpha-2":"NI","Languages":"es-NI,en"},{"ISO3166-1-Alpha-2":"NE","Languages":"fr-NE,ha,kr,dje"},{"ISO3166-1-Alpha-2":"NG","Languages":"en-NG,ha,yo,ig,ff"},{"ISO3166-1-Alpha-2":"NU","Languages":"niu,en-NU"},{"ISO3166-1-Alpha-2":"NF","Languages":"en-NF"},{"ISO3166-1-Alpha-2":"MP","Languages":"fil,tl,zh,ch-MP,en-MP"},{"ISO3166-1-Alpha-2":"NO","Languages":"no,nb,nn,se,fi"},{"ISO3166-1-Alpha-2":"OM","Languages":"ar-OM,en,bal,ur"},{"ISO3166-1-Alpha-2":"PK","Languages":"ur-PK,en-PK,pa,sd,ps,brh"},{"ISO3166-1-Alpha-2":"PW","Languages":"pau,sov,en-PW,tox,ja,fil,zh"},{"ISO3166-1-Alpha-2":"PA","Languages":"es-PA,en"},{"ISO3166-1-Alpha-2":"PG","Languages":"en-PG,ho,meu,tpi"},{"ISO3166-1-Alpha-2":"PY","Languages":"es-PY,gn"},{"ISO3166-1-Alpha-2":"PE","Languages":"es-PE,qu,ay"},{"ISO3166-1-Alpha-2":"PH","Languages":"tl,en-PH,fil"},{"ISO3166-1-Alpha-2":"PN","Languages":"en-PN"},{"ISO3166-1-Alpha-2":"PL","Languages":"pl"},{"ISO3166-1-Alpha-2":"PT","Languages":"pt-PT,mwl"},{"ISO3166-1-Alpha-2":"PR","Languages":"en-PR,es-PR"},{"ISO3166-1-Alpha-2":"QA","Languages":"ar-QA,es"},{"ISO3166-1-Alpha-2":"KR","Languages":"ko-KR,en"},{"ISO3166-1-Alpha-2":"MD","Languages":"ro,ru,gag,tr"},{"ISO3166-1-Alpha-2":"RO","Languages":"ro,hu,rom"},{"ISO3166-1-Alpha-2":"RU","Languages":"ru,tt,xal,cau,ady,kv,ce,tyv,cv,udm,tut,mns,bua,myv,mdf,chm,ba,inh,tut,kbd,krc,av,sah,nog"},{"ISO3166-1-Alpha-2":"RW","Languages":"rw,en-RW,fr-RW,sw"},{"ISO3166-1-Alpha-2":"RE","Languages":"fr-RE"},{"ISO3166-1-Alpha-2":"BL","Languages":"fr"},{"ISO3166-1-Alpha-2":"SH","Languages":"en-SH"},{"ISO3166-1-Alpha-2":"KN","Languages":"en-KN"},{"ISO3166-1-Alpha-2":"LC","Languages":"en-LC"},{"ISO3166-1-Alpha-2":"MF","Languages":"fr"},{"ISO3166-1-Alpha-2":"PM","Languages":"fr-PM"},{"ISO3166-1-Alpha-2":"VC","Languages":"en-VC,fr"},{"ISO3166-1-Alpha-2":"WS","Languages":"sm,en-WS"},{"ISO3166-1-Alpha-2":"SM","Languages":"it-SM"},{"ISO3166-1-Alpha-2":"ST","Languages":"pt-ST"},{"ISO3166-1-Alpha-2":null,"Languages":null},{"ISO3166-1-Alpha-2":"SA","Languages":"ar-SA"},{"ISO3166-1-Alpha-2":"SN","Languages":"fr-SN,wo,fuc,mnk"},{"ISO3166-1-Alpha-2":"RS","Languages":"sr,hu,bs,rom"},{"ISO3166-1-Alpha-2":"SC","Languages":"en-SC,fr-SC"},{"ISO3166-1-Alpha-2":"SL","Languages":"en-SL,men,tem"},{"ISO3166-1-Alpha-2":"SG","Languages":"cmn,en-SG,ms-SG,ta-SG,zh-SG"},{"ISO3166-1-Alpha-2":"SX","Languages":"nl,en"},{"ISO3166-1-Alpha-2":"SK","Languages":"sk,hu"},{"ISO3166-1-Alpha-2":"SI","Languages":"sl,sh"},{"ISO3166-1-Alpha-2":"SB","Languages":"en-SB,tpi"},{"ISO3166-1-Alpha-2":"SO","Languages":"so-SO,ar-SO,it,en-SO"},{"ISO3166-1-Alpha-2":"ZA","Languages":"zu,xh,af,nso,en-ZA,tn,st,ts,ss,ve,nr"},{"ISO3166-1-Alpha-2":"GS","Languages":"en"},{"ISO3166-1-Alpha-2":"SS","Languages":"en"},{"ISO3166-1-Alpha-2":"ES","Languages":"es-ES,ca,gl,eu,oc"},{"ISO3166-1-Alpha-2":"LK","Languages":"si,ta,en"},{"ISO3166-1-Alpha-2":"PS","Languages":"ar-PS"},{"ISO3166-1-Alpha-2":"SD","Languages":"ar-SD,en,fia"},{"ISO3166-1-Alpha-2":"SR","Languages":"nl-SR,en,srn,hns,jv"},{"ISO3166-1-Alpha-2":"SJ","Languages":"no,ru"},{"ISO3166-1-Alpha-2":"SZ","Languages":"en-SZ,ss-SZ"},{"ISO3166-1-Alpha-2":"SE","Languages":"sv-SE,se,sma,fi-SE"},{"ISO3166-1-Alpha-2":"CH","Languages":"de-CH,fr-CH,it-CH,rm"},{"ISO3166-1-Alpha-2":"SY","Languages":"ar-SY,ku,hy,arc,fr,en"},{"ISO3166-1-Alpha-2":"TJ","Languages":"tg,ru"},{"ISO3166-1-Alpha-2":"TH","Languages":"th,en"},{"ISO3166-1-Alpha-2":"MK","Languages":"mk,sq,tr,rmm,sr"},{"ISO3166-1-Alpha-2":"TL","Languages":"tet,pt-TL,id,en"},{"ISO3166-1-Alpha-2":"TG","Languages":"fr-TG,ee,hna,kbp,dag,ha"},{"ISO3166-1-Alpha-2":"TK","Languages":"tkl,en-TK"},{"ISO3166-1-Alpha-2":"TO","Languages":"to,en-TO"},{"ISO3166-1-Alpha-2":"TT","Languages":"en-TT,hns,fr,es,zh"},{"ISO3166-1-Alpha-2":"TN","Languages":"ar-TN,fr"},{"ISO3166-1-Alpha-2":"TR","Languages":"tr-TR,ku,diq,az,av"},{"ISO3166-1-Alpha-2":"TM","Languages":"tk,ru,uz"},{"ISO3166-1-Alpha-2":"TC","Languages":"en-TC"},{"ISO3166-1-Alpha-2":"TV","Languages":"tvl,en,sm,gil"},{"ISO3166-1-Alpha-2":"UG","Languages":"en-UG,lg,sw,ar"},{"ISO3166-1-Alpha-2":"UA","Languages":"uk,ru-UA,rom,pl,hu"},{"ISO3166-1-Alpha-2":"AE","Languages":"ar-AE,fa,en,hi,ur"},{"ISO3166-1-Alpha-2":"GB","Languages":"en-GB,cy-GB,gd"},{"ISO3166-1-Alpha-2":"TZ","Languages":"sw-TZ,en,ar"},{"ISO3166-1-Alpha-2":"UM","Languages":"en-UM"},{"ISO3166-1-Alpha-2":"VI","Languages":"en-VI"},{"ISO3166-1-Alpha-2":"US","Languages":"en-US,es-US,haw,fr"},{"ISO3166-1-Alpha-2":"UY","Languages":"es-UY"},{"ISO3166-1-Alpha-2":"UZ","Languages":"uz,ru,tg"},{"ISO3166-1-Alpha-2":"VU","Languages":"bi,en-VU,fr-VU"},{"ISO3166-1-Alpha-2":"VE","Languages":"es-VE"},{"ISO3166-1-Alpha-2":"VN","Languages":"vi,en,fr,zh,km"},{"ISO3166-1-Alpha-2":"WF","Languages":"wls,fud,fr-WF"},{"ISO3166-1-Alpha-2":"EH","Languages":"ar,mey"},{"ISO3166-1-Alpha-2":"YE","Languages":"ar-YE"},{"ISO3166-1-Alpha-2":"ZM","Languages":"en-ZM,bem,loz,lun,lue,ny,toi"},{"ISO3166-1-Alpha-2":"ZW","Languages":"en-ZW,sn,nr,nd"},{"ISO3166-1-Alpha-2":"AX","Languages":"sv-AX"}]`;
  
//https://pkgstore.datahub.io/core/country-codes/country-codes_json/data/471a2e653140ecdd7243cdcacfd66608/country-codes_json.json
const langtags = JSON.parse(languageTagsJson);
langtags.forEach(function(ll: any) {
  if (
    ll['ISO3166-1-Alpha-2'] === null ||
      ll['ISO3166-1-Alpha-2'].length !== 2 ||
      ll['Languages'] === null
  ) {
    return;
  } // lol
  const f = countries.findIndex(
    (e) => e.shortcode.toUpperCase() === ll['ISO3166-1-Alpha-2'].toUpperCase()
  );
  if (f === -1) {
    return;
  }
  const mainl = ll.Languages.split(',')[0].split('-')[0];
  if (mainl.length !== 2) {
    return;
  }
  countries[f].mainLanguage = mainl;
});
  
/*
  
  let sepp = txt.split('\n');
  let final = ``;
  for(var i = 0; i < sepp.length; i+=1) {
      if(sepp[i].indexOf('	') === -1 && sepp[i].indexOf('U+') !== -1) continue;
      if(sepp[i].indexOf('U+') > -1) {
          let seppmore = sepp[i].substring(16).split('\'').join('´');
          final = final.split('%fullname%').join(seppmore) + ',\n';
      } else if( /[^a-zA-Z0-9]/.test(sepp[i])) {
          if(sepp[i+1].indexOf('U+') > -1) continue;
          final += 'new Country(\'' + sepp[i].substring(0,2) + '\',\'%fullname%\',discord.decor.Emojis.FLAG_' + sepp[i].substring(0,2) + ', \'\')';
      }
      //final = `${final}${sepp[i]}`
  }
  */
  