import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { Callout } from "./tiptap-callout";

// Les mêmes extensions servent à écrire (éditeur) et à lire (affichage).
export const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: false, // pas de liens dans le texte pour l'instant
    underline: false,
  }),
  Callout,
  Image.configure({ allowBase64: false, HTMLAttributes: { loading: "lazy", alt: "" } }),
];
