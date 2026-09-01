// Alaya, phase 1. Menu, emplacement et langue, filtres, galerie, options, panier,
// recherche. Les pages restent lisibles sans JavaScript.

(function () {
  var BASE = window.BASE || '/';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  // ================================================================
  // Les langues. Le francais est la source, l'anglais et l'italien
  // sont poses par-dessus : phrases entieres d'abord, puis le
  // vocabulaire de joaillerie dans les textes de piece.
  // ================================================================
  // sans JavaScript, rien ne bouge et tout reste lisible
  if (window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('js');

  var LANG = 'fr';
  try { LANG = localStorage.getItem('alaya-langue') || 'fr'; } catch (e) {}
  var L = window.ALAYA_LANGUES || { PHRASES: {}, TERMES: {}, noms: {} };
  if (!L.PHRASES[LANG]) LANG = 'fr';

  function norm(t) { return t.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim(); }

  var DICO = {};
  if (LANG !== 'fr') {
    Object.keys(L.PHRASES[LANG]).forEach(function (k) { DICO[norm(k)] = L.PHRASES[LANG][k]; });
  }
  function T(t) {
    if (LANG === 'fr' || !t) return t;
    var v = DICO[norm(t)];
    return v === undefined ? t : v;
  }

  var motifTermes = null, tableTermes = {};
  function TT(t) {
    if (LANG === 'fr' || !t) return t;
    var direct = DICO[norm(t)];
    if (direct !== undefined) return direct;
    if (!motifTermes) {
      var liste = (L.TERMES[LANG] || []).slice().sort(function (a, b) { return b[0].length - a[0].length; });
      if (!liste.length) return t;
      var morceaux = liste.map(function (pair) {
        tableTermes[norm(pair[0])] = pair[1];
        return norm(pair[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      });
      motifTermes = new RegExp(morceaux.join('|'), 'g');
    }
    return norm(t).replace(motifTermes, function (m) { return tableTermes[m] !== undefined ? tableTermes[m] : m; });
  }

  function traduirePage() {
    if (LANG === 'fr') return;
    document.documentElement.lang = (L.html && L.html[LANG]) || LANG;
    var zonesTermes = ['FICHE-TEXTE', 'ACC-CORPS', 'ATTRIBUTS'];
    var marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var noeuds = [];
    while (marche.nextNode()) noeuds.push(marche.currentNode);
    noeuds.forEach(function (n) {
      var brut = n.nodeValue;
      if (!brut || !brut.trim()) return;
      var parent = n.parentNode;
      if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) return;
      var v = DICO[norm(brut)];
      if (v !== undefined) { n.nodeValue = brut.replace(brut.trim(), v); return; }
      var dansTexte = parent && parent.closest &&
        parent.closest('.fiche-texte, .acc-corps, .attributs, .liste-intro, .block-seo, .grid-seo-text, .sel, .achat-note, .note-specs');
      if (dansTexte) {
        var tr = TT(brut);
        if (tr !== norm(brut)) n.nodeValue = brut.replace(brut.trim(), tr);
      }
    });
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(function (attr) {
      $$('[' + attr + ']').forEach(function (el) {
        var v = DICO[norm(el.getAttribute(attr))];
        if (v !== undefined) el.setAttribute(attr, v);
      });
    });
    $$('.topbar-btn[data-panel="langue"]').forEach(function (b) {
      b.childNodes[0].nodeValue = (L.noms && L.noms[LANG]) || LANG;
    });
  }


  // --- menu mobile
  var panneau = $('.menu-vertical'), scrim = $('.menu-scrim');
  function ouvrir(v) {
    if (!panneau) return;
    panneau.classList.toggle('is-open', v);
    if (scrim) scrim.classList.toggle('is-on', v);
    document.documentElement.classList.toggle('menu-ouvert', !!v);
  }
  if ($('.menu-burger')) $('.menu-burger').addEventListener('click', function () { ouvrir(true); });

  // le menu mobile a deux niveaux : une vue a la fois, la pastille Retour ramene
  function vue(cle) {
    $$('.mv-vue').forEach(function (v) { v.hidden = !(cle ? v.id === 'mv-' + cle : v.classList.contains('mv-racine')); });
    if (panneau) panneau.scrollTop = 0;
  }
  $$('.mv-vers').forEach(function (b) { b.addEventListener('click', function () { vue(b.dataset.vers); }); });
  $$('.btn-retour').forEach(function (b) { b.addEventListener('click', function () { vue(null); }); });
  if ($('.menu-close')) $('.menu-close').addEventListener('click', function () { ouvrir(false); });
  if (scrim) scrim.addEventListener('click', function () { ouvrir(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ouvrir(false); });

  // --- emplacement et langue
  $$('.topbar-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var cible = document.getElementById('panel-' + b.dataset.panel);
      if (!cible) return;
      var ouvertDeja = !cible.hidden;
      $$('.topbar-panel').forEach(function (p) { p.hidden = true; });
      cible.hidden = ouvertDeja;
      var enFeuille = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
      if (!cible.hidden) { ouvrir(false); if (!enFeuille) window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  });
  // sur telephone le panneau est une feuille : toucher a cote la referme
  document.addEventListener('click', function (e) {
    if (e.target.closest('.topbar-panel, .topbar-btn')) return;
    $$('.topbar-panel').forEach(function (p) { p.hidden = true; });
  });
  function poserChoix(cle, valeur) {
    try { localStorage.setItem('alaya-' + cle, valeur); } catch (e) {}
    if (cle === 'langue') { location.reload(); return; }
    if (cle === 'emplacement') {
      $$('.topbar-btn[data-panel="emplacement"] b').forEach(function (b) { b.textContent = valeur; });
    }
  }
  $$('.choix-btn[data-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.choix-btn[data-set="' + b.dataset.set + '"]').forEach(function (o) { o.classList.remove('is-on'); });
      b.classList.add('is-on');
      poserChoix(b.dataset.set, b.dataset.value);
      $$('.topbar-panel').forEach(function (p) { p.hidden = true; });
    });
  });
  try {
    var emp = localStorage.getItem('alaya-emplacement');
    if (emp) {
      $$('.topbar-btn[data-panel="emplacement"] b').forEach(function (b) { b.textContent = emp; });
      $$('.choix-btn[data-set="emplacement"]').forEach(function (o) {
        o.classList.toggle('is-on', o.dataset.value === emp);
      });
    }
    $$('.choix-btn[data-set="langue"]').forEach(function (o) {
      o.classList.toggle('is-on', o.dataset.value === LANG);
    });
  } catch (e) {}

  // --- filtres de rayon
  var boiteFiltres = $('.filtres'), btnFiltrer = $('.btn-filtrer');
  if (boiteFiltres && btnFiltrer) {
    btnFiltrer.hidden = false;
    btnFiltrer.addEventListener('click', function () { boiteFiltres.hidden = !boiteFiltres.hidden; });
  }
  var chips = $$('.chip[data-filtre]'), reset = $('.chip--reset'),
      cartes = $$('.grid-results .product-card'), compte = $('.liste-tete .count');
  function appliquer() {
    var actifs = chips.filter(function (c) { return c.classList.contains('is-on'); })
                      .map(function (c) { return c.dataset.filtre; });
    var vus = 0;
    cartes.forEach(function (carte) {
      var f = (carte.dataset.filtres || '').split(';').map(function (s) { return s.trim(); });
      var ok = actifs.every(function (a) { return f.indexOf(a) !== -1; });
      carte.classList.toggle('is-hidden', !ok);
      if (ok) vus++;
    });
    if (compte) compte.textContent = '(' + vus + ')';
    if (reset) reset.hidden = actifs.length === 0;
    var url = new URL(window.location);
    if (actifs.length) url.searchParams.set('filtre', actifs.join(',')); else url.searchParams.delete('filtre');
    history.replaceState(null, '', url);
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { c.classList.toggle('is-on'); appliquer(); }); });
  if (reset) reset.addEventListener('click', function () {
    chips.forEach(function (c) { c.classList.remove('is-on'); }); appliquer();
  });
  var depart = new URL(window.location).searchParams.get('filtre');
  if (depart && chips.length) {
    if (boiteFiltres) boiteFiltres.hidden = false;
    depart.split(',').forEach(function (f) {
      chips.forEach(function (c) { if (c.dataset.filtre === f) c.classList.add('is-on'); });
    });
    appliquer();
  }

  // --- galerie de la fiche, une variante a la fois
  var groupes = $$('.gal-groupe'), vigns = $$('.gal-vign');
  var etat = { couleur: null, pierre: null };
  if (groupes.length) {
    etat.couleur = groupes[0].dataset.couleur || null;
    etat.pierre = groupes[0].dataset.pierre || null;
  }
  function syncSelecteurs(g) {
    $$('.sel').forEach(function (sel) {
      var opt = $$('.opt', sel).filter(function (o) {
        return (o.dataset.couleur && o.dataset.couleur === g.dataset.couleur) ||
               (o.dataset.pierre && o.dataset.pierre === g.dataset.pierre);
      })[0];
      if (!opt) return;
      $$('.opt', sel).forEach(function (x) { x.classList.remove('is-on'); });
      opt.classList.add('is-on');
      var val = $('.sel-val', sel);
      if (val.textContent !== opt.dataset.value) {
        val.textContent = opt.dataset.value;
        val.classList.remove('vif'); void val.offsetWidth; val.classList.add('vif');
      }
      $('.sel-label', sel).textContent = opt.dataset.axe;
    });
  }
  function montrerGroupe(couleur, pierre, axe) {
    if (!groupes.length) return;
    var g = groupes.filter(function (x) {
      return x.dataset.couleur === couleur && x.dataset.pierre === pierre;
    })[0];
    if (!g && axe) {
      var v = axe === 'couleur' ? couleur : pierre;
      g = groupes.filter(function (x) { return x.dataset[axe] === v; })[0];
    }
    if (!g) return;
    groupes.forEach(function (x) { x.hidden = x !== g; });
    vigns.forEach(function (v) {
      v.classList.toggle('is-on', v.dataset.couleur === g.dataset.couleur &&
                                  v.dataset.pierre === g.dataset.pierre);
    });
    etat.couleur = g.dataset.couleur || null;
    etat.pierre = g.dataset.pierre || null;
    syncSelecteurs(g);
  }
  vigns.forEach(function (v) {
    v.addEventListener('click', function () { montrerGroupe(v.dataset.couleur, v.dataset.pierre); });
  });
  if (groupes.length) syncSelecteurs(groupes[0]);

  // --- options de la fiche
  $$('.sel').forEach(function (sel) {
    var tete = $('.sel-tete', sel), corps = $('.sel-corps', sel);
    tete.addEventListener('click', function () {
      var ferme = corps.hidden;
      $$('.sel-corps').forEach(function (c) { c.hidden = true; });
      $$('.sel').forEach(function (s) { s.classList.remove('is-open'); });
      corps.hidden = !ferme;
      sel.classList.toggle('is-open', ferme);
    });
    $$('.opt', sel).forEach(function (o) {
      o.addEventListener('click', function () {
        $$('.opt', sel).forEach(function (x) { x.classList.remove('is-on'); });
        o.classList.add('is-on');
        if (o.dataset.prix) { var bl = $('.achat'), px = $('.achat-prix'); bl.dataset.prix = o.dataset.prix; px.textContent = euros(parseFloat(o.dataset.prix)); px.classList.remove('achat-prix--vide'); var ml = $('.montant-libre input'); if (ml) ml.value = ''; }
        if (o.dataset.couleur) montrerGroupe(o.dataset.couleur, etat.pierre, 'couleur');
        if (o.dataset.pierre) montrerGroupe(etat.couleur, o.dataset.pierre, 'pierre');
        $('.sel-val', sel).textContent = o.dataset.value;
        $('.sel-label', sel).textContent = o.dataset.axe;
        if (!o.dataset.couleur && !o.dataset.pierre) { corps.hidden = true; sel.classList.remove('is-open'); }
      });
    });
  });

  // --- guide des tailles
  var modale = $('#modale-tailles');
  if (modale) {
    var basculer = function (v) {
      if (v) {
        modale.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { modale.classList.add('is-open'); }); });
        document.body.style.overflow = 'hidden';
      } else {
        modale.classList.remove('is-open');
        document.body.style.overflow = '';
        setTimeout(function () { if (!modale.classList.contains('is-open')) modale.hidden = true; }, 380);
      }
    };
    $$('.lien-guide').forEach(function (b) { b.addEventListener('click', function () { basculer(true); }); });
    $('.modale-fermer', modale).addEventListener('click', function () { basculer(false); });
    modale.addEventListener('click', function (e) { if (e.target === modale) basculer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') basculer(false); });
  }

  // --- panier local, le paiement Stripe arrive en phase 2
  function euros(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0€';
  }
  function lirePanier() {
    try { return JSON.parse(localStorage.getItem('alaya-panier') || '[]'); } catch (e) { return []; }
  }
  function ecrirePanier(v) {
    try { localStorage.setItem('alaya-panier', JSON.stringify(v)); } catch (e) {}
    majCompte();
  }
  function majCompte() {
    var n = lirePanier().length, el = $('.panier-compte');
    if (el) {
      var avant = el.textContent; el.hidden = n === 0; el.textContent = '(' + n + ')';
      if (avant && avant !== el.textContent) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    }
  }
  majCompte();

  // une ligne de reponse sous les boutons : sans elle, un clic sans taille ne
  // donnait aucun signe et le panier semblait inaccessible.
  function flash(html, erreur) {
    var zone = $('.achat-flash');
    if (!zone) {
      var boutons = $('.achat-boutons');
      if (!boutons) return;
      zone = document.createElement('p');
      zone.className = 'achat-flash';
      zone.setAttribute('role', 'status');
      boutons.parentNode.insertBefore(zone, boutons.nextSibling);
    }
    zone.className = 'achat-flash' + (erreur ? ' achat-flash--erreur' : '');
    zone.innerHTML = html;
  }

  var btnAjout = $('.btn-panier[data-slug]');
  if (btnAjout) {
    btnAjout.addEventListener('click', function () {
      var bloc = $('.achat');
      var options = $$('.sel').map(function (s) {
        var v = $('.sel-val', s).textContent;
        return v ? (s.dataset.axe + ' : ' + v) : null;
      }).filter(Boolean);
      var chk = $('.chk-offrir');
      if (chk && chk.checked) options.push('Cadeau : écrin, mot joint, prix masqué');
      var manquant = $$('.sel').filter(function (s) { return !$('.sel-val', s).textContent; });
      if (manquant.length) {
        manquant[0].classList.add('is-open');
        $('.sel-corps', manquant[0]).hidden = false;
        manquant[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        var libelle = $('.sel-label', manquant[0]);
        flash((libelle ? libelle.textContent.trim() : T('Une option')) + '\u00a0: ' + T('à choisir avant d’ajouter au panier.'), true);
        return;
      }
      var p = lirePanier();
      p.push({ nom: bloc.dataset.nom, prix: parseFloat(bloc.dataset.prix || 0),
               img: bloc.dataset.img, url: bloc.dataset.url, options: options });
      ecrirePanier(p);
      btnAjout.classList.add('is-ok');
      btnAjout.textContent = T('Ajouté au panier');
      flash(T('Ajouté au panier') + '. <a href="' + BASE + 'panier/index.html">' + T('Voir le panier') + '</a>', false);
      setTimeout(function () {
        btnAjout.classList.remove('is-ok');
        btnAjout.textContent = T('Ajouter au panier');
      }, 2600);
    });
  }
  var libre = $('.montant-libre input');
  if (libre) {
    libre.addEventListener('input', function () {
      var v = parseFloat(libre.value), sel = libre.closest('.sel'), px = $('.achat-prix');
      if (v >= 300) {
        $('.achat').dataset.prix = v; px.textContent = euros(v); px.classList.remove('achat-prix--vide');
        $$('.opt', sel).forEach(function (x) { x.classList.remove('is-on'); });
        $('.sel-val', sel).textContent = euros(v);
      }
    });
  }
  var btnPay = $('.btn-pay');
  if (btnPay) btnPay.addEventListener('click', function () { window.location = BASE + 'panier/index.html'; });

  var ICONE_SAC = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

  function ligneHTML(l, i, court) {
    return '<div class="panier-ligne">' +
      (l.img ? '<img src="' + BASE + l.img + '" alt="">' : '<div class="media"></div>') +
      '<div><a href="' + BASE + l.url + '">' + l.nom + '</a>' +
      (l.options && l.options.length ? '<p class="opts">' + l.options.join(' &middot; ') + '</p>' : '') +
      (court ? '' : '<button class="retirer" data-i="' + i + '">' + T('Retirer') + '</button>') +
      '</div>' +
      '<div>' + (l.prix ? euros(l.prix) : T('Prix sur demande')) + '</div>' +
      '</div>';
  }

  var boitePanier = $('#panier');
  if (boitePanier) {
    var rendre = function () {
      var p = lirePanier();
      if (!p.length) {
        boitePanier.innerHTML = '<div class="panier-vide">' + ICONE_SAC +
          '<p>' + T('Votre panier est vide') + '</p>' +
          '<a class="btn-panier" href="' + BASE + 'toute-la-collection/index.html">' + T('Continuer mes achats') + '</a></div>';
        return;
      }
      var total = p.reduce(function (s, l) { return s + (l.prix || 0); }, 0);
      boitePanier.innerHTML = p.map(function (l, i) { return ligneHTML(l, i, false); }).join('') +
        '<div class="panier-total"><span>' + T('Total') + '</span><span class="fete">' + euros(total) + '<i class="etincelle etincelle--3"></i><i class="etincelle etincelle--2"></i></span></div>' +
        '<a class="btn-panier btn-panier--plein" href="' + BASE + 'commande/index.html">' + T('Passer commande') + '</a>';
      $$('.retirer', boitePanier).forEach(function (b) {
        b.addEventListener('click', function () {
          var p2 = lirePanier(); p2.splice(parseInt(b.dataset.i, 10), 1); ecrirePanier(p2); rendre();
        });
      });
    };
    rendre();
  }

  // --- recherche
  var champ = $('#q'), sortie = $('#resultats');
  if (champ && sortie && window.CATALOGUE) {
    var sansAccent = function (s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    };
    var chercher = function (q) {
      q = sansAccent(q).trim();
      if (!q) { sortie.innerHTML = ''; return; }
      var mots = q.split(/\s+/);
      var res = window.CATALOGUE.filter(function (p) {
        var champs = sansAccent(p.n + ' ' + p.r + ' ' + p.c);
        return mots.every(function (m) { return champs.indexOf(m) !== -1; });
      });
      sortie.innerHTML = res.map(function (p) {
        return '<article class="product-card"><a href="' + BASE + p.u + '">' +
          (p.i ? '<img src="' + BASE + p.i + '" alt="" loading="lazy">' : '<div class="media"></div>') +
          '<p class="name">' + p.n + '</p><p class="price">' + p.p + '</p></a></article>';
      }).join('') || '<p class="empty-state">Aucune pièce ne correspond.</p>';
    };
    champ.addEventListener('input', function () { chercher(champ.value); });
    var q0 = new URL(window.location).searchParams.get('q');
    if (q0) { champ.value = q0; chercher(q0); }
  }
  // ================================================================
  // Ajout rapide depuis la grille, tunnel de commande, mouvement.
  // ================================================================

  var ICO_SAC_MINI = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

  function slugDeLien(href) {
    var m = (href || '').match(/piece\/([^\/]+)\//);
    return m ? m[1] : null;
  }

  // --- le panneau d'ajout rapide, un seul pour toute la page
  var panneauRapide = null, choixRapide = {}, pieceRapide = null;

  function fermerRapide() {
    if (!panneauRapide) return;
    panneauRapide.classList.remove('is-open');
    setTimeout(function () { panneauRapide.hidden = true; }, 320);
  }

  function construireRapide() {
    panneauRapide = document.createElement('div');
    panneauRapide.className = 'ajout-rapide';
    panneauRapide.hidden = true;
    panneauRapide.innerHTML = '<div class="voile"></div><div class="ar-boite" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(panneauRapide);
    panneauRapide.querySelector('.voile').addEventListener('click', fermerRapide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerRapide(); });
  }

  function dessinerRapide() {
    var b = panneauRapide.querySelector('.ar-boite'), p = pieceRapide;
    var axes = (p.o || []).map(function (ax) {
      var opts = ax.v.map(function (v) {
        return '<button class="opt' + (choixRapide[ax.a] === v ? ' is-on' : '') + '" type="button" data-axe="' + ax.a + '" data-value="' + v + '">' + TT(v) + '</button>';
      }).join('');
      return '<div class="ar-tailles"><p>' + T(ax.a) + '</p><div class="ar-liste">' + opts + '</div></div>';
    }).join('');
    var manque = (p.o || []).some(function (ax) { return !choixRapide[ax.a]; });
    b.innerHTML =
      '<div class="ar-tete"><img src="' + BASE + p.i + '" alt="">' +
        '<div><p class="ar-nom">' + p.n + '</p><p class="ar-prix">' + (p.p ? euros(p.p) : T('Prix sur demande')) + '</p></div>' +
        '<button class="ar-fermer" aria-label="Fermer">&#10005;</button></div>' +
      axes +
      '<div class="ar-pied"><button class="btn-panier" type="button" id="ar-ajouter">' + ICO_SAC_MINI + '<span>' + (manque ? T('Choisir pour ajouter') : T('Ajouter au panier')) + '</span></button>' +
      '<a class="ar-lien" href="' + BASE + p.u + '"><span>' + T('Voir la fiche complète') + '</span></a></div>';

    b.querySelector('.ar-fermer').addEventListener('click', fermerRapide);
    $$('.opt', b).forEach(function (o) {
      o.addEventListener('click', function () {
        choixRapide[o.dataset.axe] = o.dataset.value;
        dessinerRapide();
      });
    });
    b.querySelector('#ar-ajouter').addEventListener('click', function () {
      var reste = (p.o || []).filter(function (ax) { return !choixRapide[ax.a]; });
      if (reste.length) {
        var titres = $$('.ar-tailles p', b);
        titres.forEach(function (t) { if (t.textContent === reste[0].a) t.style.color = '#9c2b2b'; });
        return;
      }
      var options = (p.o || []).map(function (ax) { return ax.a + ' : ' + choixRapide[ax.a]; });
      var panier = lirePanier();
      panier.push({ nom: p.n, prix: p.p, img: p.i, url: p.u, options: options });
      ecrirePanier(panier);
      var pied = b.querySelector('.ar-pied');
      pied.innerHTML = '<a class="btn-panier" href="' + BASE + 'panier/index.html">' + T('Voir le panier') + '</a>' +
        '<button class="pf-continuer" type="button" id="ar-continuer">' + T('Continuer mes achats') + '</button>';
      b.querySelector('#ar-continuer').addEventListener('click', fermerRapide);
    });
  }

  function ouvrirRapide(slug) {
    var p = (window.ALAYA_PIECES || {})[slug];
    if (!p) return false;
    if (!panneauRapide) construireRapide();
    pieceRapide = p; choixRapide = {};
    // un seul choix possible : on le pose d'avance
    (p.o || []).forEach(function (ax) { if (ax.v.length === 1) choixRapide[ax.a] = ax.v[0]; });
    dessinerRapide();
    panneauRapide.hidden = false;
    requestAnimationFrame(function () { panneauRapide.classList.add('is-open'); });
    return true;
  }

  // le bouton rond sur chaque vignette de grille
  if (window.ALAYA_PIECES) {
    $$('.product-card').forEach(function (carte) {
      var lien = $('a', carte), slug = slugDeLien(lien && lien.getAttribute('href'));
      if (!slug || !window.ALAYA_PIECES[slug]) return;
      var b = document.createElement('button');
      b.className = 'btn-rapide';
      b.type = 'button';
      b.setAttribute('aria-label', 'Ajouter au panier');
      b.innerHTML = ICO_SAC_MINI;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); ouvrirRapide(slug); });
      carte.appendChild(b);
    });
  }

  // --- le recapitulatif et le formulaire de commande
  var recap = $('#recap');
  if (recap) {
    var lignes = lirePanier();
    if (!lignes.length) {
      recap.innerHTML = '<p class="opts">' + T('Votre panier est vide') + '</p>';
    } else {
      var t = lignes.reduce(function (s, l) { return s + (l.prix || 0); }, 0);
      recap.innerHTML = lignes.map(function (l, i) { return ligneHTML(l, i, true); }).join('') +
        '<div class="panier-total"><span>' + T('Total') + '</span><span class="fete">' + euros(t) + '<i class="etincelle etincelle--3"></i><i class="etincelle etincelle--2"></i></span></div>';
      var bp = $('#btn-payer');
      if (bp) bp.textContent = T('Payer') + ' ' + euros(t);
    }
  }

  var formCommande = $('#form-commande');
  if (formCommande) {
    formCommande.addEventListener('submit', function (e) {
      e.preventDefault();
      var erreur = $('#erreur-form'), manquants = [];
      $$('input[required]', formCommande).forEach(function (c) {
        var vide = !c.value.trim();
        c.classList.toggle('est-vide', vide);
        if (vide) manquants.push(c);
      });
      if (!lirePanier().length) {
        erreur.hidden = false;
        erreur.textContent = T('Votre panier est vide');
        return;
      }
      if (manquants.length) {
        erreur.hidden = false;
        erreur.textContent = T('Il manque un renseignement.');
        manquants[0].focus();
        return;
      }
      erreur.hidden = true;
      var num = 'ALY-' + String(Math.floor(Math.random() * 9000) + 1000);
      $('#num-commande').textContent = num;
      $('#etape-formulaire').hidden = true;
      $('#etape-confirmation').hidden = false;
      var etapes = $$('.etapes li');
      if (etapes.length === 3) {
        etapes[1].className = 'est-faite';
        etapes[2].className = 'est-la';
      }
      ecrirePanier([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- les blocs montent en arrivant, comme chez eux (slide-in-up)
  var doux = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doux && 'IntersectionObserver' in window) {
    var aAnimer = $$('.page-home main > section, .block-merchandising, .apparentees, .deux-voies, .page-edito .js-anim, .taille-scene, .couleur-scene, .purete-scene, .carat-scene');
    if (aAnimer.length) {
      var oeil = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('est-la'); oeil.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      aAnimer.forEach(function (el, i) {
        if (i === 0 && el.classList.contains('block-text-on-full-media')) return; // le hero reste en place
        el.classList.add('js-anim');
        oeil.observe(el);
      });
    }
  }



  // ================================================================
  // La loupe, la seconde image au survol, la barre d'achat qui suit.
  // ================================================================

  // --- la loupe : on clique le bijou, il prend toute la page
  var vues = $$('.gal-groupe:not([hidden]) .gal-vue img, .gal-vue img');
  if (vues.length) {
    var loupe = null, iLoupe = 0, imagesLoupe = [];

    function majLoupe() {
      var img = $('img', loupe);
      img.src = imagesLoupe[iLoupe];
      loupe.classList.remove('est-zoom');
      img.style.transform = '';
      var compte = $('.loupe-compte', loupe);
      compte.textContent = imagesLoupe.length > 1 ? (iLoupe + 1) + ' / ' + imagesLoupe.length : '';
      $$('.loupe-nav', loupe).forEach(function (b) { b.hidden = imagesLoupe.length < 2; });
    }
    function fermerLoupe() {
      loupe.classList.remove('is-open');
      setTimeout(function () { loupe.hidden = true; }, 300);
      document.body.style.overflow = '';
    }
    function construireLoupe() {
      loupe = document.createElement('div');
      loupe.className = 'loupe';
      loupe.hidden = true;
      loupe.innerHTML = '<button class="loupe-fermer" aria-label="' + T('Fermer') + '">&#10005;</button>' +
        '<button class="loupe-nav loupe-prec" aria-label="' + T('Précédent') + '">&lsaquo;</button>' +
        '<div class="loupe-cadre"><img alt=""></div>' +
        '<button class="loupe-nav loupe-suiv" aria-label="' + T('Suivant') + '">&rsaquo;</button>' +
        '<p class="loupe-compte"></p>';
      document.body.appendChild(loupe);
      $('.loupe-fermer', loupe).addEventListener('click', fermerLoupe);
      $('.loupe-prec', loupe).addEventListener('click', function () {
        iLoupe = (iLoupe - 1 + imagesLoupe.length) % imagesLoupe.length; majLoupe();
      });
      $('.loupe-suiv', loupe).addEventListener('click', function () {
        iLoupe = (iLoupe + 1) % imagesLoupe.length; majLoupe();
      });
      loupe.addEventListener('click', function (e) { if (e.target === loupe || e.target.className === 'loupe-cadre') fermerLoupe(); });
      var img = $('img', loupe);
      // un clic de plus : on entre dans la pierre, la souris promene le cadrage
      img.addEventListener('click', function (e) {
        e.stopPropagation();
        var zoom = loupe.classList.toggle('est-zoom');
        img.style.transform = zoom ? 'scale(2.2)' : '';
      });
      img.addEventListener('mousemove', function (e) {
        if (!loupe.classList.contains('est-zoom')) return;
        var r = img.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        img.style.transform = 'scale(2.2) translate(' + (-x * 26) + '%, ' + (-y * 26) + '%)';
      });
      document.addEventListener('keydown', function (e) {
        if (loupe.hidden) return;
        if (e.key === 'Escape') fermerLoupe();
        if (e.key === 'ArrowRight') { iLoupe = (iLoupe + 1) % imagesLoupe.length; majLoupe(); }
        if (e.key === 'ArrowLeft') { iLoupe = (iLoupe - 1 + imagesLoupe.length) % imagesLoupe.length; majLoupe(); }
      });
    }
    function ouvrirLoupe(src) {
      if (!loupe) construireLoupe();
      imagesLoupe = $$('.gal-vue img').map(function (i) { return i.src; });
      iLoupe = Math.max(0, imagesLoupe.indexOf(src));
      majLoupe();
      loupe.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { loupe.classList.add('is-open'); });
    }
    $$('.gal-vue img').forEach(function (img) {
      img.addEventListener('click', function () { ouvrirLoupe(img.src); });
    });
  }

  // --- la seconde monture au survol de la vignette
  if (window.ALAYA_PIECES) {
    $$('.product-card a').forEach(function (lien) {
      var slug = slugDeLien(lien.getAttribute('href'));
      var p = slug && window.ALAYA_PIECES[slug];
      if (!p || !p.im || p.im.length < 2) return;
      var premiere = $('img', lien);
      if (!premiere) return;
      var alt = document.createElement('img');
      alt.className = 'carte-alt';
      alt.loading = 'lazy';
      alt.alt = '';
      alt.src = BASE + p.im[1];
      premiere.insertAdjacentElement('afterend', alt);
    });
  }

  // --- la barre d'achat qui suit, quand la carte est passee
  var carteAchat = $('.achat');
  if (carteAchat && $('.btn-panier[data-slug]')) {
    var barre = document.createElement('div');
    barre.className = 'barre-achat';
    var img0 = $('.gal-vue img');
    barre.innerHTML = (img0 ? '<img src="' + img0.src + '" alt="">' : '') +
      '<div><p class="ba-nom">' + carteAchat.dataset.nom + '</p><p class="ba-opts"></p></div>' +
      '<div class="ba-espace"></div>' +
      '<span class="ba-prix">' + ($('.achat-prix') ? $('.achat-prix').textContent : '') + '</span>' +
      '<button class="btn-panier" type="button">' + T('Ajouter au panier') + '</button>';
    document.body.appendChild(barre);
    $('.btn-panier', barre).addEventListener('click', function () {
      $('.btn-panier[data-slug]').click();
      carteAchat.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    var suivreOptions = function () {
      var choisies = $$('.sel').map(function (s) { return $('.sel-val', s).textContent; }).filter(Boolean);
      $('.ba-opts', barre).textContent = choisies.join(' · ');
      var px = $('.achat-prix');
      if (px) $('.ba-prix', barre).textContent = px.textContent;
      var vue = $('.gal-groupe:not([hidden]) .gal-vue img') || img0;
      if (vue && $('img', barre)) $('img', barre).src = vue.src;
    };
    document.addEventListener('click', function () { setTimeout(suivreOptions, 60); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        barre.classList.toggle('est-la', !e[0].isIntersecting && e[0].boundingClientRect.top < 0);
      }, { threshold: 0 }).observe(carteAchat);
    }
  }


  // ================================================================
  // Le guide du diamant : les trois echelles qui bougent, et le rail.
  // Donnees : echelles GIA, diametres d'un brillant rond standard.
  // ================================================================
  var glisseurCouleur = $('#glisseur-couleur');
  if (glisseurCouleur) {
    var LETTRES = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var FAMILLES = [
      [0, 2, 'Incolore', 'Aucune teinte, même sous la loupe du gemmologue. La plus rare.'],
      [3, 6, 'Quasi incolore', 'La teinte ne se voit pas une fois la pierre montée. Le meilleur rapport à la lumière.'],
      [7, 9, 'Teinte faible', 'Une pointe de chaleur, surtout visible sur les grandes pierres.'],
      [10, 14, 'Teinte claire', 'La teinte se voit à l’œil nu sur fond blanc.'],
      [15, 22, 'Teinte visible', 'Jaune ou brun franc. Un autre parti pris, un autre prix.']
    ];
    var majCouleur = function () {
      var i = parseInt(glisseurCouleur.value, 10);
      $('#couleur-lettre').textContent = LETTRES[i];
      $('#couleur-curseur').style.left = ((i + .5) / LETTRES.length * 100) + '%';
      $$('.couleur-lettres li').forEach(function (l, k) { l.classList.toggle('est-la', k === i); });
      for (var k = 0; k < FAMILLES.length; k++) {
        if (i >= FAMILLES[k][0] && i <= FAMILLES[k][1]) {
          $('#couleur-famille').textContent = FAMILLES[k][2];
          $('#couleur-dit').textContent = FAMILLES[k][3];
          break;
        }
      }
    };
    glisseurCouleur.addEventListener('input', majCouleur);
    majCouleur();
  }

  var glisseurPurete = $('#glisseur-purete');
  if (glisseurPurete) {
    var PURETES = [
      ['FL', 'Flawless', 'Aucune inclusion, aucune trace en surface, à dix fois. Une pierre sur des milliers.', 0],
      ['IF', 'Internally Flawless', 'Rien à l’intérieur. Tout au plus une trace de polissage en surface.', 1],
      ['VVS1', 'Very Very Slightly Included 1', 'Des inclusions que même un gemmologue peine à trouver à dix fois.', 2],
      ['VVS2', 'Very Very Slightly Included 2', 'Très difficiles à voir à dix fois. Invisibles à l’œil nu.', 3],
      ['VS1', 'Very Slightly Included 1', 'Visibles à la loupe avec un peu d’effort. Invisibles à l’œil nu.', 5],
      ['VS2', 'Very Slightly Included 2', 'Visibles à la loupe. Invisibles à l’œil nu : c’est souvent le bon compromis.', 7],
      ['SI1', 'Slightly Included 1', 'Faciles à voir à dix fois. Encore discrètes à l’œil nu.', 10],
      ['SI2', 'Slightly Included 2', 'Évidentes à la loupe, parfois visibles à l’œil nu selon l’endroit.', 14]
    ];
    var boite = $('#inclusions');
    var POINTS = [[92,88,1.9],[118,80,1.4],[104,112,2.1],[80,104,1.3],[128,110,1.7],[96,132,1.9],[112,96,1.3],[76,86,1.6],[136,92,1.2],[100,150,1.8],[86,120,1.5],[122,130,1.7],[106,66,1.1],[84,64,1.8]];
    POINTS.forEach(function (pt) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pt[0]); c.setAttribute('cy', pt[1]); c.setAttribute('r', pt[2]);
      boite.appendChild(c);
    });
    var majPurete = function () {
      var d = PURETES[parseInt(glisseurPurete.value, 10)];
      $('#purete-code').textContent = d[0];
      $('#purete-nom').textContent = d[1];
      $('#purete-dit').textContent = d[2];
      $$('circle', boite).forEach(function (c, i) { c.classList.toggle('est-la', i < d[3]); });
    };
    glisseurPurete.addEventListener('input', majPurete);
    majPurete();
  }

  var glisseurCarat = $('#glisseur-carat');
  if (glisseurCarat) {
    // poids en carats, diametre reel d'un brillant rond, en millimetres
    var CARATS = [[0.30, 4.3], [0.50, 5.2], [0.70, 5.75], [1.00, 6.5], [1.25, 6.9], [1.50, 7.4], [2.00, 8.2], [2.50, 8.8], [3.00, 9.4]];
    var majCarat = function () {
      var d = CARATS[parseInt(glisseurCarat.value, 10)];
      var taille = d[1] * 17; // 1 mm rendu a 17 px
      var cercle = $('#carat-cercle');
      cercle.style.width = taille + 'px';
      cercle.style.height = taille + 'px';
      $('#carat-mm').textContent = String(d[1]).replace('.', ',') + ' mm';
      $('#carat-valeur').textContent = d[0].toFixed(2).replace('.', ',');
    };
    glisseurCarat.addEventListener('input', majCarat);
    majCarat();
  }

  // le rail suit la lecture
  var rail = $('.guide-rail');
  if (rail && 'IntersectionObserver' in window) {
    var liens = $$('a', rail);
    var oeilRail = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        liens.forEach(function (a) { a.classList.toggle('est-la', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('.guide-bloc').forEach(function (b) { oeilRail.observe(b); });
    liens.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var cible = document.querySelector(a.getAttribute('href'));
        if (!cible) return;
        e.preventDefault();
        window.scrollTo({ top: cible.getBoundingClientRect().top + window.scrollY - 200, behavior: 'smooth' });
      });
    });
  }

  // le mot par e-mail, sans serveur
  var formContact = $('#form-contact');
  if (formContact) {
    formContact.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = formContact.elements;
      if (!f.nom.value.trim() || !f.email.value.trim() || !f.message.value.trim()) return;
      window.location.href = 'mailto:contact@alayafinejewelry.com?subject=' +
        encodeURIComponent('Message de ' + f.nom.value.trim()) + '&body=' +
        encodeURIComponent(f.message.value.trim() + '\n\n' + f.nom.value.trim() + '\n' + f.email.value.trim());
    });
  }

  // la demande de rendez-vous, par e-mail, sans serveur
  var formRdv = $('#form-rdv');
  if (formRdv) {
    formRdv.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = formRdv.elements;
      if (!f.nom.value.trim() || !f.email.value.trim()) return;
      var corps = 'Bonjour,\n\nJe souhaite prendre rendez-vous.\n\nObjet : ' + f.objet.value +
        '\nDate souhaitée : ' + (f.date.value || 'à convenir') + '\nCréneau : ' + f.moment.value +
        (f.message.value.trim() ? '\n\n' + f.message.value.trim() : '') +
        '\n\n' + f.nom.value.trim() + '\n' + f.email.value.trim() + (f.tel.value.trim() ? '\n' + f.tel.value.trim() : '');
      window.location.href = 'mailto:contact@alayafinejewelry.com?subject=' +
        encodeURIComponent('Rendez-vous, ' + f.objet.value + ' : ' + f.nom.value.trim()) + '&body=' + encodeURIComponent(corps);
    });
  }

  // --- les titres s'ecrivent mot a mot, et Celebrations a son etincelle
  var doux2 = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doux2) {
    var TITRES = '.block-text h2, .guide-tete h2, .edito-fin h2, .apparentees h2, .rdv-voie h2, .edito-deux h2, .edito-ouverture-texte h1, .block-text-on-full-media h1, .liste-ouverture-texte h1, .commande-fin h1, .contact-form h2, .liste-tete h1';
    $$(TITRES).forEach(function (t) {
      if (t.querySelector('*') && !t.querySelector('.count')) return;   // deja structure : on ne touche pas
      var count = t.querySelector('.count'); var compte = count ? count.outerHTML : '';
      var texte = count ? t.textContent.replace(count.textContent, '') : t.textContent;
      var mots = texte.trim().split(/\s+/), i = 0;
      t.innerHTML = mots.map(function (m) {
        var brille = /^(C[ée]l[ée]brations|Offrir|Merci|Fian[çc]ailles|Toujours|Diamant|diamant|pierre|lumi[èe]re)/.test(m);
        var cl = 'mot' + (brille ? ' fete' : '');
        var et = brille ? '<i class="etincelle"></i><i class="etincelle etincelle--2"></i><i class="etincelle etincelle--3"></i>' : '';
        return '<span class="' + cl + '" style="--i:' + (i++) + '">' + m + et + '</span>';
      }).join(' ') + (compte ? ' ' + compte : '');
      t.classList.add('ecrit');
    });
    if ('IntersectionObserver' in window) {
      var oeilTitres = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('est-la'); oeilTitres.unobserve(e.target); } });
      }, { threshold: .4 });
      $$('.ecrit').forEach(function (t) { oeilTitres.observe(t); });
    } else { $$('.ecrit').forEach(function (t) { t.classList.add('est-la'); }); }
  }

  traduirePage();
})();

// --- Voir plus d'objets (grille longue)
(function () {
  var btn = document.querySelector('.btn-voir-plus'), grid = document.querySelector('.grid-results[data-page]');
  if (!btn || !grid) return;
  var pas = parseInt(grid.dataset.page, 10) || 24, vus = document.querySelector('.grid-compteur .vus');
  function maj() {
    var caches = grid.querySelectorAll('.product-card.is-more');
    var total = grid.querySelectorAll('.product-card').length;
    if (vus) vus.textContent = total - caches.length;
    if (!caches.length) btn.hidden = true;
  }
  btn.addEventListener('click', function () {
    var caches = grid.querySelectorAll('.is-more'), n = 0;
    for (var i = 0; i < caches.length && n < pas; i++) {
      caches[i].classList.remove('is-more');
      if (caches[i].classList.contains('product-card')) n++;
    }
    maj();
  });
  maj();
})();
