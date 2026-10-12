# KEMI KØL — Atomet og kølemidler

Interaktivt kemi-læringsunivers til køleteknik-elever.
Af Mads Christian Søgaard Wendelboe.

Hele læringsuniverset ligger i én fil, [`index.html`](index.html). Den
kræver ingen installation eller internetforbindelse: åbn filen i en browser,
så kører den.

## Indhold

- **Mit forløb** — mit læringsunivers, missioner og quiz
- **Kemi** — byg et atom, byg molekyler, ioner og salte, reaktionsskemaer,
  syrer og baser, oxidation og korrosion, idealgasloven, det periodiske system
- **Køleteknik** — kølemidler, olie, returflasker, sikkerhed, h log p
  sammenligning, stråling og drivhuseffekt, TEWI
- **Ekstra materialer** — ellære

Elevens fremskridt gemmes i browserens lokale lager (`localStorage`) på den
enkelte computer.

## Online med GitHub Pages

Siden ligger på
<https://madschristianw-bot.github.io/Kemi-l-ringsunivers/>.

Workflowet [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
udgiver siden, hver gang der pushes. Det kræver, at **Settings → Pages →
Source** står på **GitHub Actions**. Under fanen **Actions** kan du se, om
udgivelsen lykkedes.

GitHub Pages på et privat repository kræver GitHub Pro (eller et Team- eller
Enterprise-abonnement). Med en gratis konto skal repositoriet være offentligt.

## Opdater læringsuniverset

Erstat `index.html` med den nye version, og commit og push ændringen.
Workflowet udgiver automatisk den nye version efter et minut eller to.
