import { useContext } from 'react';
import { TranslationsContext } from '~/providers/translations-provider';

export const useTranslations = () => useContext(TranslationsContext);
