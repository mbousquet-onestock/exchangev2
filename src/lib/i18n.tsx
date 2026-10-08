import { createContext, Fragment, useContext, useMemo, type ReactNode } from "react";

export const LANGUAGES = ["en", "fr", "es", "de", "it"] as const;
export type Language = (typeof LANGUAGES)[number];

const en = {
  "article.returnUntil": "Return possible until {date}",
  "article.notReturnable": "Not returnable — exchange only for breakage or carrier loss",
  "article.returnExpired": "Withdrawal period over since {date} — exchange only for breakage or carrier loss",
  "config.returnBlocked": "Return not allowed for this item: exchange (reshipment) only, for breakage or carrier loss.",
  "settings.featureReturnEligible": "Return eligibility feature",
  "settings.featureReturnEligibleHint": "Item feature: oui / non (true / false). Missing = returnable.",
  "settings.featureReturnDelay": "Withdrawal period feature",
  "settings.featureReturnDelayHint":
    "Item feature in days, from the last state change of the line (else the order date). Missing = no limit.",
  "reasons.exchange": "Breakage, Lost by carrier",
  "settings.closeOnConfirm": "Close the window after confirmation",
  "settings.closeOnConfirmHint":
    "Sends the message below to OneStock and closes the window when it was opened as a popup / new tab.",
  "settings.closeMessageType": "Close message (postMessage type)",
  "settings.closeMessageTypeHint": "Message sent to the OneStock parent page, e.g. extension_close.",
  "settings.refreshOnConfirm": "Refresh the OneStock page after confirmation",
  "settings.refreshOnConfirmHint":
    "Sends the refresh message, then reloads the page the extension was opened from (which also closes it when embedded).",
  "settings.refreshMessageType": "Refresh message (postMessage type)",
  "settings.refreshUrl": "Page to reload",
  "settings.refreshUrlHint": "Empty = parent_url sent by OneStock. {site_id} and {order_id} are replaced.",
  "settings.subOrderIdFormat": "Exchange sub-order id",
  "settings.subOrderIdFormatHint": "{order_id} = initial order, {n} = 1, 2… (first id that does not exist yet).",
  "footer.submitting": "Sending…",
  "submit.error": "The request could not be saved: {detail}",
  "submit.success": "Request saved: {count} line(s) moved to return.",
  "submit.subOrder": "Exchange sub-order {id} created.",
  "settings.returnState": "Return state",
  "settings.returnStateHint": "State the selected lines are moved to on confirmation (PATCH /line_item_groups).",
  "config.sameModel": "Replacement",
  "config.differentModel": "Substitution",
  "config.replacementItem": "Replacement item",
  "config.noSubstitutes": "No substitution item is defined for this item.",
  "config.sheetDetails": "Item sheet",
  "catalog.loading": "Loading item sheets…",
  "catalog.error": "Item sheets unavailable ({detail}) — items shown with their id.",
  "settings.featureSubstitution": "Substitution feature",
  "settings.featureSubstitutionHint":
    "Feature of the ordered item listing the substitution item ids (order_items.item.features.…).",
  "settings.sheetFeatures": "Sheet features",
  "settings.sheetFeaturesHint": "Extra features shown on the substitute sheets, comma separated.",
  "reasons.return": "Withdrawal, Doesn't suit me",
  "config.substitutes": "Possible substitutes ({count})",
  "stock.loading": "Checking stock…",
  "stock.available": "{count} available in stock",
  "stock.short": "{count} in stock",
  "stock.out": "Out of stock",
  "stock.unknown": "Stock unknown for this item.",
  "stock.notConfigured": "Stock not configured (stock query missing in Settings).",
  "stock.error": "Stock unavailable: {detail}",
  "footer.settings": "Settings",
  "settings.backToExchange": "Back",
  "settings.stock": "Stock & substitutes",
  "settings.stockRequestName": "Stock query (request_name)",
  "settings.stockRequestNameHint":
    "Stock query defined in OMC > Configuration > Stock > Stock Queries, used by GET /stock_export.",
  "settings.stockEndpointIds": "Stock locations",
  "settings.stockEndpointIdsHint": "Comma separated endpoint ids. Empty = locations of the stock query.",
  "settings.featurePrice": "Price feature",
  "tabs.exchange": "Exchange",
  "tabs.settings": "Settings",
  "header.noSite": "no site",
  "header.noOrder": "no order",

  "steps.items": "Items",
  "steps.options": "Options",
  "steps.method": "Method",
  "steps.validation": "Validation",

  "selection.banner": "Select items to return or exchange",
  "selection.noneEligible": "No item of this order is eligible (eligible states: {states}).",
  "selection.notEligible": "{count} item(s) not eligible for return or exchange",
  "article.qty": "Qty {qty}",

  "config.banner": "Choose your return or exchange options",
  "config.return": "Return",
  "config.exchange": "Exchange",
  "config.returnReason": "Return reason",
  "config.exchangeReason": "Exchange reason",
  "price.payByLink": "A pay-by-link for {amount} will be sent to complete the order.",
  "price.refund": "A refund of {amount} will be issued to the original payment method.",
  "price.even": "No additional payment or refund required for this exchange.",

  "method.banner": "Select the return method",
  "method.inStore": "In store return",
  "method.inStoreDesc": "Drop off at any of our retail locations.",
  "method.carrier": "Carrier: Standard delivery",
  "method.carrierDesc": "Drop off at a carrier access point.",

  "validation.banner": "Confirm your contact and shipping details",
  "field.firstName": "First name",
  "field.lastName": "Last name",
  "field.email": "Email",
  "field.phone": "Phone",
  "field.address": "Address",
  "field.city": "City",
  "field.zip": "Zip",
  "field.country": "Country",

  "footer.back": "Back",
  "footer.cancel": "Cancel",
  "footer.next": "Next",
  "footer.confirm": "Confirm",

  "app.missing": "Missing {what}: open this page from OneStock or set fallback values in Settings.",
  "app.siteId": "site id",
  "app.orderId": "order id",
  "app.and": "and",
  "app.openSettings": "Open settings",
  "app.retry": "Retry",
  "app.loading": "Loading order {order}…",
  "app.waiting": "Waiting for OneStock context…",

  "error.noToken": "No API token configured. Fill it in the Settings tab.",
  "error.noCredentials": "Login / password missing. Fill them in the Settings tab.",
  "error.network": "Network error calling {url}: {detail}.",
  "error.networkCors": "This is often a CORS issue — try enabling the proxy in Settings.",

  "settings.stored": "Settings are stored in this browser only (localStorage).",
  "settings.context": "OneStock context",
  "settings.mode": "Mode",
  "settings.embedded": "Embedded (iframe)",
  "settings.standalone": "Standalone",
  "settings.received": "received",
  "settings.notReceived": "not received",
  "settings.siteId": "Site id",
  "settings.orderId": "Order id",
  "settings.userId": "User id",
  "settings.hostApp": "Host app",
  "settings.apiUrl": "API url",
  "settings.language": "Language",
  "settings.rawContext": "Raw context",
  "settings.siteIdFallback": "Site id (fallback)",
  "settings.siteIdFallbackHint": "Used when the context has no site_id.",
  "settings.orderIdFallback": "Order id (fallback)",
  "settings.orderIdFallbackHint": "Used when the context has no order id.",
  "settings.connection": "API connection",
  "settings.environment": "Environment",
  "settings.qualif": "Qualification",
  "settings.production": "Production",
  "settings.custom": "Custom URL",
  "settings.apiVersion": "API version",
  "settings.customBaseUrl": "Custom base URL",
  "settings.customBaseUrlHint": "Without version. {site_id} is replaced.",
  "settings.useContextApiUrl": "Use the api_url sent by OneStock when available",
  "settings.useProxy": "Route calls through the /api/proxy CORS proxy",
  "settings.useProxyHint": "Needed when the OneStock API refuses browser calls from this domain.",
  "settings.resolvedUrl": "Resolved base URL:",
  "settings.auth": "Authentication",
  "settings.authToken": "API token",
  "settings.authCredentials": "Login / password",
  "settings.token": "Token",
  "settings.tokenHint": "Sent in the body of each request (root-level `token`).",
  "settings.user": "User id",
  "settings.userHint": "A token is requested via POST /login.",
  "settings.password": "Password",
  "settings.display": "Display",
  "settings.uiLanguage": "Interface language",
  "settings.auto": "Automatic (from context: {lang})",
  "settings.featuresLang": "Item features lang",
  "settings.featuresLangHint": "Empty = interface language.",
  "settings.articles": "Articles",
  "settings.eligibleStates": "Eligible line states",
  "settings.eligibleStatesHint": "Comma separated, e.g. fulfilled, delivered",
  "settings.featureName": "Name feature",
  "settings.featureColor": "Color feature",
  "settings.featureSize": "Size feature",
  "settings.featureImage": "Image feature(s)",
  "settings.reasons": "Reasons",
  "settings.returnReasons": "Return reasons",
  "settings.exchangeReasons": "Exchange reasons",
  "settings.reasonsHint": "Comma separated. Empty = default reasons translated in the interface language.",
  "settings.reset": "Reset defaults",
  "settings.saved": "Saved",
  "settings.saveAndLoad": "Save & load order",
  "settings.save": "Save",

  "state.fulfilled": "Fulfilled",
  "state.returned": "Returned",
  "state.cancelled": "Cancelled",
  "state.removed": "Removed",
  "state.dispatched": "Dispatched",
  "state.delivered": "Delivered",
  "state.collected": "Collected",
  "state.pending": "Pending",
};

export type MessageKey = keyof typeof en;
type Dictionary = Record<MessageKey, string>;

const fr: Dictionary = {
  "article.returnUntil": "Retour possible jusqu'au {date}",
  "article.notReturnable": "Non retournable — échange uniquement en cas de casse ou perte transporteur",
  "article.returnExpired":
    "Délai de rétractation dépassé depuis le {date} — échange uniquement en cas de casse ou perte transporteur",
  "config.returnBlocked":
    "Retour non autorisé pour cet article : échange (réexpédition) uniquement, en cas de casse ou perte transporteur.",
  "settings.featureReturnEligible": "Caract. éligibilité au retour",
  "settings.featureReturnEligibleHint": "Caractéristique article : oui / non (true / false). Absente = retournable.",
  "settings.featureReturnDelay": "Caract. délai de rétractation",
  "settings.featureReturnDelayHint":
    "Caractéristique article en jours, à partir du dernier changement d'état de la ligne (sinon la date de commande). Absente = sans limite.",
  "reasons.exchange": "Casse, Perte transporteur",
  "settings.closeOnConfirm": "Fermer la fenêtre après confirmation",
  "settings.closeOnConfirmHint":
    "Envoie le message ci-dessous à OneStock et ferme la fenêtre si elle a été ouverte en popup / nouvel onglet.",
  "settings.closeMessageType": "Message de fermeture (type postMessage)",
  "settings.closeMessageTypeHint": "Message envoyé à la page OneStock parente, ex. extension_close.",
  "settings.refreshOnConfirm": "Rafraîchir la page OneStock après confirmation",
  "settings.refreshOnConfirmHint":
    "Envoie le message de rafraîchissement puis recharge la page d'où l'extension a été ouverte (ce qui la ferme aussi si elle est intégrée).",
  "settings.refreshMessageType": "Message de rafraîchissement (type postMessage)",
  "settings.refreshUrl": "Page à recharger",
  "settings.refreshUrlHint": "Vide = parent_url envoyée par OneStock. {site_id} et {order_id} sont remplacés.",
  "settings.subOrderIdFormat": "Id de la sous-commande d'échange",
  "settings.subOrderIdFormatHint": "{order_id} = commande initiale, {n} = 1, 2… (premier id qui n'existe pas encore).",
  "footer.submitting": "Envoi…",
  "submit.error": "La demande n'a pas pu être enregistrée : {detail}",
  "submit.success": "Demande enregistrée : {count} ligne(s) passée(s) en retour.",
  "submit.subOrder": "Sous-commande d'échange {id} créée.",
  "settings.returnState": "État de retour",
  "settings.returnStateHint": "État donné aux lignes sélectionnées à la confirmation (PATCH /line_item_groups).",
  "config.sameModel": "Remplacement",
  "config.differentModel": "Substitution",
  "config.replacementItem": "Article de remplacement",
  "config.noSubstitutes": "Aucun article de substitution n'est défini pour cet article.",
  "config.sheetDetails": "Fiche article",
  "catalog.loading": "Chargement des fiches articles…",
  "catalog.error": "Fiches articles indisponibles ({detail}) — articles affichés avec leur identifiant.",
  "settings.featureSubstitution": "Caract. substitution",
  "settings.featureSubstitutionHint":
    "Caractéristique de l'article commandé listant les ids des articles de substitution (order_items.item.features.…).",
  "settings.sheetFeatures": "Caract. de la fiche",
  "settings.sheetFeaturesHint":
    "Caractéristiques supplémentaires affichées sur les fiches de substitution, séparées par des virgules.",
  "reasons.return": "Rétractation, Ne convient pas",
  "config.substitutes": "Articles de substitution ({count})",
  "stock.loading": "Vérification du stock…",
  "stock.available": "{count} disponible(s) en stock",
  "stock.short": "{count} en stock",
  "stock.out": "Rupture de stock",
  "stock.unknown": "Stock inconnu pour cet article.",
  "stock.notConfigured": "Stock non configuré (requête de stock manquante dans les Paramètres).",
  "stock.error": "Stock indisponible : {detail}",
  "footer.settings": "Paramètres",
  "settings.backToExchange": "Retour",
  "settings.stock": "Stock et substitution",
  "settings.stockRequestName": "Requête de stock (request_name)",
  "settings.stockRequestNameHint":
    "Requête définie dans OMC > Configuration > Stock > Stock Queries, utilisée par GET /stock_export.",
  "settings.stockEndpointIds": "Emplacements de stock",
  "settings.stockEndpointIdsHint":
    "Ids d'endpoints séparés par des virgules. Vide = emplacements de la requête de stock.",
  "settings.featurePrice": "Caract. prix",
  "tabs.exchange": "Échange",
  "tabs.settings": "Paramètres",
  "header.noSite": "aucun site",
  "header.noOrder": "aucune commande",

  "steps.items": "Articles",
  "steps.options": "Options",
  "steps.method": "Mode",
  "steps.validation": "Validation",

  "selection.banner": "Sélectionnez les articles à retourner ou échanger",
  "selection.noneEligible": "Aucun article de cette commande n'est éligible (états éligibles : {states}).",
  "selection.notEligible": "{count} article(s) non éligible(s) au retour ou à l'échange",
  "article.qty": "Qté {qty}",

  "config.banner": "Choisissez vos options de retour ou d'échange",
  "config.return": "Retour",
  "config.exchange": "Échange",
  "config.returnReason": "Motif de retour",
  "config.exchangeReason": "Motif d'échange",
  "price.payByLink": "Un lien de paiement de {amount} vous sera envoyé pour finaliser la commande.",
  "price.refund": "Un remboursement de {amount} sera effectué sur le moyen de paiement d'origine.",
  "price.even": "Aucun paiement ni remboursement supplémentaire pour cet échange.",

  "method.banner": "Sélectionnez le mode de retour",
  "method.inStore": "Retour en magasin",
  "method.inStoreDesc": "Déposez l'article dans l'un de nos magasins.",
  "method.carrier": "Transporteur : livraison standard",
  "method.carrierDesc": "Déposez le colis dans un point relais du transporteur.",

  "validation.banner": "Confirmez vos coordonnées et votre adresse",
  "field.firstName": "Prénom",
  "field.lastName": "Nom",
  "field.email": "E-mail",
  "field.phone": "Téléphone",
  "field.address": "Adresse",
  "field.city": "Ville",
  "field.zip": "Code postal",
  "field.country": "Pays",

  "footer.back": "Précédent",
  "footer.cancel": "Annuler",
  "footer.next": "Suivant",
  "footer.confirm": "Confirmer",

  "app.missing":
    "{what} manquant : ouvrez cette page depuis OneStock ou renseignez des valeurs de secours dans les Paramètres.",
  "app.siteId": "Site id",
  "app.orderId": "numéro de commande",
  "app.and": "et",
  "app.openSettings": "Ouvrir les paramètres",
  "app.retry": "Réessayer",
  "app.loading": "Chargement de la commande {order}…",
  "app.waiting": "En attente du contexte OneStock…",

  "error.noToken": "Aucun token API configuré. Renseignez-le dans l'onglet Paramètres.",
  "error.noCredentials": "Identifiant / mot de passe manquants. Renseignez-les dans l'onglet Paramètres.",
  "error.network": "Erreur réseau lors de l'appel à {url} : {detail}.",
  "error.networkCors": "C'est souvent un problème de CORS — activez le proxy dans les Paramètres.",

  "settings.stored": "Les paramètres sont stockés uniquement dans ce navigateur (localStorage).",
  "settings.context": "Contexte OneStock",
  "settings.mode": "Mode",
  "settings.embedded": "Intégré (iframe)",
  "settings.standalone": "Autonome",
  "settings.received": "reçu",
  "settings.notReceived": "non reçu",
  "settings.siteId": "Site id",
  "settings.orderId": "Commande",
  "settings.userId": "Utilisateur",
  "settings.hostApp": "Application hôte",
  "settings.apiUrl": "URL API",
  "settings.language": "Langue",
  "settings.rawContext": "Contexte brut",
  "settings.siteIdFallback": "Site id (secours)",
  "settings.siteIdFallbackHint": "Utilisé si le contexte ne fournit pas de site_id.",
  "settings.orderIdFallback": "Commande (secours)",
  "settings.orderIdFallbackHint": "Utilisé si le contexte ne fournit pas de commande.",
  "settings.connection": "Connexion API",
  "settings.environment": "Environnement",
  "settings.qualif": "Qualification",
  "settings.production": "Production",
  "settings.custom": "URL personnalisée",
  "settings.apiVersion": "Version API",
  "settings.customBaseUrl": "URL de base personnalisée",
  "settings.customBaseUrlHint": "Sans la version. {site_id} est remplacé.",
  "settings.useContextApiUrl": "Utiliser l'api_url envoyée par OneStock si disponible",
  "settings.useProxy": "Passer par le proxy CORS /api/proxy",
  "settings.useProxyHint": "Nécessaire si l'API OneStock refuse les appels navigateur depuis ce domaine.",
  "settings.resolvedUrl": "URL de base utilisée :",
  "settings.auth": "Authentification",
  "settings.authToken": "Token API",
  "settings.authCredentials": "Identifiant / mot de passe",
  "settings.token": "Token",
  "settings.tokenHint": "Envoyé dans le corps de chaque requête (champ `token`).",
  "settings.user": "Identifiant",
  "settings.userHint": "Un token est demandé via POST /login.",
  "settings.password": "Mot de passe",
  "settings.display": "Affichage",
  "settings.uiLanguage": "Langue de l'interface",
  "settings.auto": "Automatique (contexte : {lang})",
  "settings.featuresLang": "Langue des caractéristiques",
  "settings.featuresLangHint": "Vide = langue de l'interface.",
  "settings.articles": "Articles",
  "settings.eligibleStates": "États de ligne éligibles",
  "settings.eligibleStatesHint": "Séparés par des virgules, ex. fulfilled, delivered",
  "settings.featureName": "Caract. nom",
  "settings.featureColor": "Caract. couleur",
  "settings.featureSize": "Caract. taille",
  "settings.featureImage": "Caract. image",
  "settings.reasons": "Motifs",
  "settings.returnReasons": "Motifs de retour",
  "settings.exchangeReasons": "Motifs d'échange",
  "settings.reasonsHint": "Séparés par des virgules. Vide = motifs par défaut traduits dans la langue de l'interface.",
  "settings.reset": "Valeurs par défaut",
  "settings.saved": "Enregistré",
  "settings.saveAndLoad": "Enregistrer et charger",
  "settings.save": "Enregistrer",

  "state.fulfilled": "Terminé",
  "state.returned": "Retourné",
  "state.cancelled": "Annulé",
  "state.removed": "Supprimé",
  "state.dispatched": "Expédié",
  "state.delivered": "Livré",
  "state.collected": "Retiré",
  "state.pending": "En attente",
};

// Other languages translate the customer-facing workflow; anything missing falls back to English.
const es: Partial<Dictionary> = {
  "article.returnUntil": "Devolución posible hasta el {date}",
  "article.notReturnable": "No retornable — cambio solo por rotura o pérdida del transportista",
  "article.returnExpired":
    "Plazo de desistimiento vencido desde el {date} — cambio solo por rotura o pérdida del transportista",
  "config.returnBlocked":
    "Devolución no permitida para este artículo: solo cambio (reenvío) por rotura o pérdida del transportista.",
  "reasons.exchange": "Rotura, Pérdida del transportista",
  "footer.submitting": "Enviando…",
  "submit.error": "No se pudo registrar la solicitud: {detail}",
  "submit.success": "Solicitud registrada: {count} línea(s) en devolución.",
  "submit.subOrder": "Subpedido de cambio {id} creado.",
  "config.sameModel": "Reemplazo",
  "config.differentModel": "Sustitución",
  "config.replacementItem": "Artículo de reemplazo",
  "config.noSubstitutes": "No hay artículos de sustitución definidos para este artículo.",
  "config.sheetDetails": "Ficha del artículo",
  "catalog.loading": "Cargando fichas…",
  "reasons.return": "Desistimiento, No me queda bien",
  "config.substitutes": "Artículos de sustitución ({count})",
  "stock.loading": "Comprobando stock…",
  "stock.available": "{count} disponible(s) en stock",
  "stock.short": "{count} en stock",
  "stock.out": "Agotado",
  "stock.unknown": "Stock desconocido para este artículo.",
  "tabs.exchange": "Cambio",
  "tabs.settings": "Ajustes",
  "steps.items": "Artículos",
  "steps.options": "Opciones",
  "steps.method": "Método",
  "steps.validation": "Validación",
  "selection.banner": "Seleccione los artículos a devolver o cambiar",
  "selection.noneEligible": "Ningún artículo de este pedido es elegible (estados elegibles: {states}).",
  "selection.notEligible": "{count} artículo(s) no elegible(s) para devolución o cambio",
  "article.qty": "Cant. {qty}",
  "config.banner": "Elija sus opciones de devolución o cambio",
  "config.return": "Devolución",
  "config.exchange": "Cambio",
  "config.returnReason": "Motivo de devolución",
  "config.exchangeReason": "Motivo de cambio",
  "price.payByLink": "Se enviará un enlace de pago de {amount} para completar el pedido.",
  "price.refund": "Se reembolsarán {amount} en el método de pago original.",
  "price.even": "No se requiere pago ni reembolso adicional para este cambio.",
  "method.banner": "Seleccione el método de devolución",
  "method.inStore": "Devolución en tienda",
  "method.inStoreDesc": "Entréguelo en cualquiera de nuestras tiendas.",
  "method.carrier": "Transportista: entrega estándar",
  "method.carrierDesc": "Entréguelo en un punto de recogida del transportista.",
  "validation.banner": "Confirme sus datos de contacto y envío",
  "field.firstName": "Nombre",
  "field.lastName": "Apellido",
  "field.email": "Correo electrónico",
  "field.phone": "Teléfono",
  "field.address": "Dirección",
  "field.city": "Ciudad",
  "field.zip": "Código postal",
  "field.country": "País",
  "footer.back": "Atrás",
  "footer.cancel": "Cancelar",
  "footer.next": "Siguiente",
  "footer.confirm": "Confirmar",
  "app.loading": "Cargando el pedido {order}…",
  "state.fulfilled": "Completado",
  "state.returned": "Devuelto",
  "state.cancelled": "Cancelado",
  "state.delivered": "Entregado",
};

const de: Partial<Dictionary> = {
  "article.returnUntil": "Rückgabe möglich bis {date}",
  "article.notReturnable": "Nicht rückgabefähig — Umtausch nur bei Bruch oder Verlust durch den Versanddienst",
  "article.returnExpired":
    "Widerrufsfrist seit {date} abgelaufen — Umtausch nur bei Bruch oder Verlust durch den Versanddienst",
  "config.returnBlocked":
    "Rückgabe für diesen Artikel nicht erlaubt: nur Umtausch (Neuversand) bei Bruch oder Verlust durch den Versanddienst.",
  "reasons.exchange": "Bruch, Verlust durch Versanddienst",
  "footer.submitting": "Wird gesendet…",
  "submit.error": "Die Anfrage konnte nicht gespeichert werden: {detail}",
  "submit.success": "Anfrage gespeichert: {count} Position(en) in Rücksendung.",
  "submit.subOrder": "Umtausch-Unterauftrag {id} erstellt.",
  "config.sameModel": "Ersatz",
  "config.differentModel": "Substitution",
  "config.replacementItem": "Ersatzartikel",
  "config.noSubstitutes": "Für diesen Artikel sind keine Ersatzartikel definiert.",
  "config.sheetDetails": "Artikeldetails",
  "catalog.loading": "Artikeldaten werden geladen…",
  "reasons.return": "Widerruf, Passt nicht",
  "config.substitutes": "Ersatzartikel ({count})",
  "stock.loading": "Bestand wird geprüft…",
  "stock.available": "{count} auf Lager verfügbar",
  "stock.short": "{count} auf Lager",
  "stock.out": "Nicht auf Lager",
  "stock.unknown": "Bestand für diesen Artikel unbekannt.",
  "tabs.exchange": "Umtausch",
  "tabs.settings": "Einstellungen",
  "steps.items": "Artikel",
  "steps.options": "Optionen",
  "steps.method": "Methode",
  "steps.validation": "Bestätigung",
  "selection.banner": "Artikel für Rücksendung oder Umtausch auswählen",
  "selection.noneEligible": "Kein Artikel dieser Bestellung ist berechtigt (berechtigte Status: {states}).",
  "selection.notEligible": "{count} Artikel nicht für Rücksendung oder Umtausch berechtigt",
  "article.qty": "Menge {qty}",
  "config.banner": "Wählen Sie Ihre Rücksende- oder Umtauschoptionen",
  "config.return": "Rücksendung",
  "config.exchange": "Umtausch",
  "config.returnReason": "Rücksendegrund",
  "config.exchangeReason": "Umtauschgrund",
  "price.payByLink": "Ein Zahlungslink über {amount} wird gesendet, um die Bestellung abzuschließen.",
  "price.refund": "Eine Erstattung von {amount} erfolgt auf die ursprüngliche Zahlungsmethode.",
  "price.even": "Für diesen Umtausch ist keine Zahlung oder Erstattung erforderlich.",
  "method.banner": "Rücksendemethode auswählen",
  "method.inStore": "Rückgabe im Geschäft",
  "method.inStoreDesc": "In einer unserer Filialen abgeben.",
  "method.carrier": "Versanddienstleister: Standardversand",
  "method.carrierDesc": "An einer Annahmestelle des Versanddienstleisters abgeben.",
  "validation.banner": "Bestätigen Sie Ihre Kontakt- und Versanddaten",
  "field.firstName": "Vorname",
  "field.lastName": "Nachname",
  "field.email": "E-Mail",
  "field.phone": "Telefon",
  "field.address": "Adresse",
  "field.city": "Stadt",
  "field.zip": "PLZ",
  "field.country": "Land",
  "footer.back": "Zurück",
  "footer.cancel": "Abbrechen",
  "footer.next": "Weiter",
  "footer.confirm": "Bestätigen",
  "app.loading": "Bestellung {order} wird geladen…",
  "state.fulfilled": "Erfüllt",
  "state.returned": "Zurückgesendet",
  "state.cancelled": "Storniert",
  "state.delivered": "Zugestellt",
};

const it: Partial<Dictionary> = {
  "article.returnUntil": "Reso possibile fino al {date}",
  "article.notReturnable": "Non restituibile — cambio solo per rottura o smarrimento del corriere",
  "article.returnExpired": "Termine di recesso scaduto dal {date} — cambio solo per rottura o smarrimento del corriere",
  "config.returnBlocked":
    "Reso non consentito per questo articolo: solo cambio (rispedizione) per rottura o smarrimento del corriere.",
  "reasons.exchange": "Rottura, Smarrimento del corriere",
  "footer.submitting": "Invio…",
  "submit.error": "Impossibile registrare la richiesta: {detail}",
  "submit.success": "Richiesta registrata: {count} riga/e in reso.",
  "submit.subOrder": "Sotto-ordine di cambio {id} creato.",
  "config.sameModel": "Rimpiazzo",
  "config.differentModel": "Sostituzione",
  "config.replacementItem": "Articolo di rimpiazzo",
  "config.noSubstitutes": "Nessun articolo sostitutivo definito per questo articolo.",
  "config.sheetDetails": "Scheda articolo",
  "catalog.loading": "Caricamento delle schede…",
  "reasons.return": "Recesso, Non va bene",
  "config.substitutes": "Articoli sostitutivi ({count})",
  "stock.loading": "Verifica dello stock…",
  "stock.available": "{count} disponibile/i in stock",
  "stock.short": "{count} in stock",
  "stock.out": "Esaurito",
  "stock.unknown": "Stock sconosciuto per questo articolo.",
  "tabs.exchange": "Cambio",
  "tabs.settings": "Impostazioni",
  "steps.items": "Articoli",
  "steps.options": "Opzioni",
  "steps.method": "Metodo",
  "steps.validation": "Conferma",
  "selection.banner": "Seleziona gli articoli da restituire o cambiare",
  "selection.noneEligible": "Nessun articolo di questo ordine è idoneo (stati idonei: {states}).",
  "selection.notEligible": "{count} articolo/i non idoneo/i al reso o al cambio",
  "article.qty": "Qtà {qty}",
  "config.banner": "Scegli le opzioni di reso o cambio",
  "config.return": "Reso",
  "config.exchange": "Cambio",
  "config.returnReason": "Motivo del reso",
  "config.exchangeReason": "Motivo del cambio",
  "price.payByLink": "Riceverai un link di pagamento di {amount} per completare l'ordine.",
  "price.refund": "Un rimborso di {amount} sarà emesso sul metodo di pagamento originale.",
  "price.even": "Nessun pagamento o rimborso aggiuntivo per questo cambio.",
  "method.banner": "Seleziona il metodo di reso",
  "method.inStore": "Reso in negozio",
  "method.inStoreDesc": "Consegna in uno dei nostri negozi.",
  "method.carrier": "Corriere: consegna standard",
  "method.carrierDesc": "Consegna in un punto di ritiro del corriere.",
  "validation.banner": "Conferma i tuoi dati di contatto e di spedizione",
  "field.firstName": "Nome",
  "field.lastName": "Cognome",
  "field.email": "Email",
  "field.phone": "Telefono",
  "field.address": "Indirizzo",
  "field.city": "Città",
  "field.zip": "CAP",
  "field.country": "Paese",
  "footer.back": "Indietro",
  "footer.cancel": "Annulla",
  "footer.next": "Avanti",
  "footer.confirm": "Conferma",
  "app.loading": "Caricamento dell'ordine {order}…",
  "state.fulfilled": "Evaso",
  "state.returned": "Restituito",
  "state.cancelled": "Annullato",
  "state.delivered": "Consegnato",
};

const DICTIONARIES: Record<Language, Partial<Dictionary>> = { en, fr, es, de, it };

/** "fr", "fr_FR", "fr-FR" → "fr"; unsupported → "en". */
export function normalizeLanguage(value?: string): Language {
  const code = (value ?? "").slice(0, 2).toLowerCase();
  return (LANGUAGES as readonly string[]).includes(code) ? (code as Language) : "en";
}

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : template;
}

export interface I18n {
  language: Language;
  /** BCP 47 locale used for number / currency formatting. */
  locale: string;
  t: (key: MessageKey, vars?: Vars) => string;
  /** Like t(), but placeholders can be React nodes (e.g. <strong>). */
  rich: (key: MessageKey, vars: Record<string, ReactNode>) => ReactNode;
  formatPrice: (amount: number, currency: string) => string;
  formatDate: (date: Date) => string;
  stateLabel: (state: string) => string;
}

export function createI18n(language: Language, locale?: string): I18n {
  const dict = DICTIONARIES[language];
  const lookup = (key: MessageKey) => dict[key] ?? en[key];
  const bcp47 = (locale || language).replace("_", "-");
  return {
    language,
    locale: bcp47,
    t: (key, vars) => interpolate(lookup(key), vars),
    rich: (key, vars) =>
      lookup(key)
        .split(/(\{\w+\})/)
        .map((part, i) => {
          const name = part.match(/^\{(\w+)\}$/)?.[1];
          return <Fragment key={i}>{name && name in vars ? vars[name] : part}</Fragment>;
        }),
    formatDate: (date) => {
      try {
        return new Intl.DateTimeFormat(bcp47, { dateStyle: "short" }).format(date);
      } catch {
        return date.toISOString().slice(0, 10);
      }
    },
    formatPrice: (amount, currency) => {
      try {
        return new Intl.NumberFormat(bcp47, { style: "currency", currency }).format(amount);
      } catch {
        return `${amount.toFixed(2)} ${currency}`;
      }
    },
    stateLabel: (state) => {
      const key = `state.${state.toLowerCase()}` as MessageKey;
      return key in en ? lookup(key) : state;
    },
  };
}

const I18nContext = createContext<I18n>(createI18n("en"));

export function I18nProvider({
  language,
  locale,
  children,
}: {
  language: Language;
  locale?: string;
  children: ReactNode;
}) {
  const value = useMemo(() => createI18n(language, locale), [language, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
