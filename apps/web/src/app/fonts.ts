import { Geist, Geist_Mono } from 'next/font/google'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

/** The product's one type pairing, for every root layout: staff app, sign-in, client portal and public forms. */
export const FONT_CLASS = `${sans.variable} ${mono.variable} font-sans`
