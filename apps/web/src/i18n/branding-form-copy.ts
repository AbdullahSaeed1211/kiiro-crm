import type { Locale } from './locale'

/** Settings, Branding: the logo and favicon uploads. */
export interface BrandingFormCopy {
  readonly logo: string
  readonly favicon: string
  readonly noFile: string
  readonly formats: string
  readonly choose: string
  readonly uploading: string
  readonly remove: string
  readonly updated: string
  readonly removed: string
  readonly removeFailed: string
  readonly tooLarge: string
  readonly uploadFailed: string
  readonly offline: string
}

export const BRANDING_FORM_COPY: Readonly<Record<Locale, BrandingFormCopy>> = {
  en: {
    logo: 'Logo',
    favicon: 'Favicon',
    noFile: 'No file',
    formats: 'PNG, JPEG, SVG, WebP, GIF, or ICO · 1 MB max',
    choose: 'Choose file',
    uploading: 'Uploading…',
    remove: 'Remove',
    updated: '{name} updated.',
    removed: '{name} removed.',
    removeFailed: 'Unable to remove asset.',
    tooLarge: 'Brand assets must be 1 MB or smaller.',
    uploadFailed: 'Upload failed.',
    offline: 'Upload failed. Check your connection and try again.',
  },
  es: {
    logo: 'Logotipo',
    favicon: 'Favicon',
    noFile: 'Sin archivo',
    formats: 'PNG, JPEG, SVG, WebP, GIF o ICO · máximo 1 MB',
    choose: 'Elegir archivo',
    uploading: 'Subiendo…',
    remove: 'Quitar',
    updated: '{name} actualizado.',
    removed: '{name} quitado.',
    removeFailed: 'No se pudo quitar el archivo.',
    tooLarge: 'Los archivos de marca deben pesar 1 MB o menos.',
    uploadFailed: 'La subida falló.',
    offline: 'La subida falló. Revisa tu conexión e inténtalo de nuevo.',
  },
}
