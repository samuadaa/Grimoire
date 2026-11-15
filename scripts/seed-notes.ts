// Vos notes de test, au format de l'éditeur (Tiptap). Les images sont à recoller à la main :
// un petit texte en italique « Image à ajouter » marque chaque emplacement.
type Inline = { type: "text"; text: string; marks?: { type: string }[] };
type Node = Record<string, unknown>;

const t = (text: string, ...marks: ("bold" | "italic" | "code")[]): Inline => ({
  type: "text",
  text,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const p = (...c: (string | Inline)[]): Node => ({
  type: "paragraph",
  content: c.map((x) => (typeof x === "string" ? t(x) : x)),
});
const ul = (...items: (string | Inline)[][]): Node => ({
  type: "bulletList",
  content: items.map((i) => ({ type: "listItem", content: [p(...i)] })),
});
const callout = (...c: Node[]): Node => ({ type: "callout", content: c });
const todo = (what: string): Node => p(t(`Image à ajouter : ${what}`, "italic"));
const doc = (...c: Node[]) => ({ type: "doc", content: c });

export type NoteSeed = {
  course: string;
  topic: string;
  type: string;
  title: string;
  fields?: Record<string, string | string[]>;
  body: object;
  sourceLabel?: string;
};

export const NOTES: NoteSeed[] = [
  // ---- Matplotlib › Datavisualisation
  {
    course: "Matplotlib",
    topic: "Datavisualisation",
    type: "Définition",
    title: "Datavisualisation",
    body: doc(
      p(
        "La datavisualisation est un ensemble de techniques utilisées pour représenter visuellement des informations clés sur un gros volume de données, afin d’en permettre la compréhension et l’analyse.",
      ),
    ),
  },
  // ---- Matplotlib › Choisir le graphique adapté
  {
    course: "Matplotlib",
    topic: "Choisir le graphique adapté",
    type: "Cas d’usage",
    title: "Représenter une évolution dans le temps",
    fields: { situation: "Une variable numérique qui évolue dans le temps", tool: "Diagrammes en ligne (courbes) ou diagrammes à barres" },
    body: doc(
      p(
        "Le choix d’un graphique dépend énormément des variables qu’on cherche à représenter et de l’information dont on dispose. Pour représenter une évolution dans le temps, on peut utiliser des ",
        t("diagrammes en ligne", "bold"),
        ", ou en courbes.",
      ),
      todo("diagramme en ligne"),
      p("Mais également des ", t("diagrammes à barres", "bold"), "."),
      todo("diagramme à barres"),
      callout(p("Une évolution suppose une seule valeur numérique par pas de temps choisi : par mois, par année, etc.")),
    ),
  },
  {
    course: "Matplotlib",
    topic: "Choisir le graphique adapté",
    type: "Cas d’usage",
    title: "Comparer différents groupes",
    fields: { situation: "Une valeur numérique agrégée par groupe ou par catégorie", tool: "Diagramme circulaire (camembert), mais l’idéal reste le diagramme à barres" },
    body: doc(
      p(
        "On utilise ce type de graphique généralement lorsqu’on a des données agrégées sur une variable non numérique : on a ainsi une valeur numérique agrégée par groupe ou par catégorie.",
      ),
      p("Pour représenter cela, on peut utiliser des ", t("diagrammes circulaires", "bold"), ", plus vulgairement appelés des camemberts."),
      todo("diagramme circulaire"),
      p("Mais l’idéal reste tout de même les ", t("diagrammes à barres", "bold"), "."),
      todo("diagramme à barres"),
    ),
  },
  {
    course: "Matplotlib",
    topic: "Choisir le graphique adapté",
    type: "Cas d’usage",
    title: "Représenter une distribution",
    fields: { situation: "Comprendre comment chaque variable se répartit", tool: "Histogramme ou diagramme à densité" },
    body: doc(
      p(
        "Ce type de graphique est particulièrement utile lors d’une analyse préliminaire, lorsqu’on souhaite comprendre les données à disposition et la façon dont chaque variable se répartit. Il y a deux cas possibles : une variable numérique et une variable non numérique.",
      ),
      p("Pour une variable numérique, on utilise généralement un ", t("histogramme", "bold"), "."),
      todo("histogramme"),
      p("Il existe aussi une variante de l’histogramme : le ", t("diagramme à densité", "bold"), "."),
      todo("diagramme à densité"),
    ),
  },
  {
    course: "Matplotlib",
    topic: "Choisir le graphique adapté",
    type: "Cas d’usage",
    title: "Représenter la relation entre 2 variables numériques",
    fields: { situation: "Deux variables numériques mises en relation", tool: "Nuage de points" },
    body: doc(
      p("C’est le cas le plus couramment rencontré, même s’il n’a pas été traité en détail dans le cours."),
      p(
        "On peut tracer plusieurs points (un pour chaque ligne) en mettant l’une des variables en abscisse et l’autre en ordonnée : c’est ce qu’on appelle un ",
        t("nuage de points", "bold"),
        ".",
      ),
      todo("nuage de points"),
    ),
  },
  // ---- React › Appréhendez la logique de React
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Définition",
    title: "Framework front-end",
    body: doc(
      p(
        "Tout ensemble de classes, de fonctions et d’utilitaires qui facilite la création d’applications web. Ces outils sont compatibles avec tous les navigateurs modernes.",
      ),
      p(
        "Le but est d’éviter de réinventer la roue pour n’importe quel besoin classique d’une application : gestion de l’interface utilisateur, des événements, des formulaires, de l’évolution dans le temps des données manipulées par l’interface, etc.",
      ),
    ),
  },
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Remarque",
    title: "L’ambition de React",
    body: doc(
      p(
        "L’ambition de React est de créer des interfaces utilisateurs avec un outil rapide et modulaire. L’idée principale est de construire l’application à partir de ",
        t("composants", "bold"),
        ".",
      ),
    ),
  },
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Définition",
    title: "Composant",
    body: doc(p("Un composant = HTML + CSS + JS.")),
  },
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Remarque",
    title: "React : licence et éditeur",
    body: doc(p("React est un projet open-source, distribué sous la licence MIT et développé principalement par Meta.")),
  },
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Nuance",
    title: "JSX n’appartient pas à React",
    fields: { initialIdea: "JSX est une extension de React pour permettre à Vite de le compiler" },
    body: doc(
      p(
        "JSX a été inventé pour React et popularisé par lui, mais il n’appartient pas à React : on peut aussi l’utiliser avec d’autres outils (Preact, SolidJS).",
      ),
      p("Vite ne compile pas « pour React » : il compile pour transformer du JSX en JavaScript."),
    ),
  },
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Code + explication",
    title: "Affichage conditionnel avec &&",
    fields: {
      language: "jsx",
      code: "<div>\n  {testActif === 'couleur' && <TestCouleur />}\n  {testActif === 'message' && <TestMessage />}\n</div>",
    },
    body: doc(
      p("On utilise l’opérateur logique ", t("&&", "code"), " (ET). C’est une autre façon de faire un ", t("if", "code"), " en React, très courante."),
      ul(
        [t("Ligne 1", "bold"), " : si ", t("testActif", "code"), " est strictement égal à ", t("'couleur'", "code"), ", alors affiche le composant ", t("<TestCouleur />", "code"), ". Si c’est faux, React ignore complètement cette ligne."],
        [t("Ligne 2", "bold"), " : si ", t("testActif", "code"), " est strictement égal à ", t("'message'", "code"), ", alors affiche le composant ", t("<TestMessage />", "code"), "."],
      ),
    ),
  },
  {
    course: "React",
    topic: "Appréhendez la logique de React",
    type: "Règle",
    title: "Un composant React ne retourne qu’un seul élément parent",
    body: doc(
      p(
        "Un composant React ne peut retourner qu’",
        t("un seul élément parent", "bold"),
        ". C’est pour cela qu’on a tout mis dans une grande ",
        t("<div style={{ padding: '20px' }}>", "code"),
        " au début. Si on met deux ",
        t("<div>", "code"),
        " côte à côte sans les envelopper, ça plante.",
      ),
      p(
        "On peut aussi utiliser des balises vides ",
        t("<>", "code"),
        " et ",
        t("</>", "code"),
        " pour les envelopper sans créer de div supplémentaire : ce sont les « Fragments ».",
      ),
    ),
  },
  // ---- Anglais technique
  {
    course: "Anglais technique",
    topic: "Non classé",
    type: "Vocabulaire",
    title: "Putting... close to",
    fields: { translations: ["Placer... à proximité de", "Regrouper... près de"] },
    sourceLabel: "Documentation de React",
    body: doc(
      p(
        "This markup syntax is called JSX. It is a JavaScript syntax extension popularized by React. ",
        t("Putting", "bold"),
        " JSX markup ",
        t("close to", "bold"),
        " related rendering logic makes React components easy to create, maintain, and delete.",
      ),
    ),
  },
  {
    course: "Anglais technique",
    topic: "Non classé",
    type: "Vocabulaire",
    title: "Whether... or...",
    fields: { translations: ["Que... ou...", "Qu’on... ou..."] },
    sourceLabel: "Documentation de React",
    body: doc(
      p(
        t("Whether", "bold"),
        " you work on your own ",
        t("or", "bold"),
        " with thousands of other developers, using React feels the same. It is designed to let you seamlessly combine components written by independent people, teams, and organizations.",
      ),
    ),
  },
];
