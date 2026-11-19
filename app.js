/* 静态全站：经典脚本与 hash 路由兼容 file://，购物和订单只保存在本浏览器，不依赖接口。 */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const assets = window.SITE_ASSETS || {};
  const sourceProducts = window.CATALOG || [];
  const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const icons = {
    search:'<circle cx="10.7" cy="10.7" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    user:'<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    bag:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8.5 8V5a3.5 3.5 0 0 1 7 0v3"/>',
    arrow:'<path d="M3 12h17m-6-6 6 6-6 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    truck:'<path d="M2 5h12v12H2zm12 5h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    leaf:'<path d="M20 3c0 0-14-2-16 7s8 14 13 5c2-4 3-12 3-12ZM5 20 16 8"/>',
    craft:'<path d="m4 19 14-14 3 3L7 22H4v-3ZM4 3l5 5m-3 3L1 6l3-3m9 13 5 5 3-3-5-5"/>',
    check:'<path d="m5 12 4 4L20 5"/>',
    filter:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--paper)"/><circle cx="15" cy="17" r="2" fill="var(--paper)"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    box:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10M7 4.7l9 5"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
  const categories = [
    {id:'living-room-system',name:'Living Room',short:'Living',image:'living',copy:'Spaces for slow mornings and evenings together.'},
    {id:'bedroom-system',name:'Bedroom',short:'Bedroom',image:'bedroom',copy:'A softer rhythm. A room that feels entirely your own.'},
    {id:'tea-cabinet-system',name:'Dining & Tea',short:'Dining & Tea',image:'tea',copy:'Beautifully considered settings for everyday rituals.'},
    {id:'closet-system',name:'Wardrobes & Closets',short:'Wardrobes',image:'closet',copy:'Give your everyday essentials a beautifully ordered home.'},
    {id:'cabinet-system',name:'Kitchen & Cabinetry',short:'Kitchen',image:'kitchen',copy:'Thoughtful cabinetry, composed around the way you live.'},
    {id:'entryway-cabinet-system',name:'Entryway',short:'Entryway',image:'entryway',copy:'A warm welcome, with everything in its place.'},
    {id:'bathroom-system',name:'Bathroom',short:'Bath',image:'bathroom',copy:'Quiet spaces to refresh, reset, and begin again.'},
    {id:'door-wall-integrated-system',name:'Doors & Wall Panels',short:'Doors & Walls',image:'door',copy:'The architectural details that bring a home together.'},
    {id:'smart-home-supporting-products',name:'Smart Living',short:'Smart Living',image:'living',copy:'Discover the original collection of supporting home solutions.'},
    {id:'strategy',name:'Whole-home Collections',short:'Whole Home',image:'dining',copy:'A complete vision, from one room to the next.'}
  ];
  const getCategory = id => categories.find(c => c.id === id);
  const products = sourceProducts.map((p, index) => ({...p, price: 690 + ((index * 373 + p.name.length * 89) % 61) * 100}));
  const getProduct = id => products.find(p => p.id === id);
  const storage = {
    read(key, fallback) { try { const value = JSON.parse(localStorage.getItem('klf-demo-' + key)); return value ?? fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem('klf-demo-' + key, JSON.stringify(value)); } catch { /* 隐私模式仍能在本次会话购物。 */ } }
  };
  const state = {
    cart: storage.read('cart', []), wishlist: storage.read('wishlist', []), user: storage.read('user', null), orders: storage.read('orders', []), recent: storage.read('recent', []),
    promo:'', menu:null, overlay:null, page:1, sort:'featured', priceFilter:[], styleFilter:[], filtersVisible:innerWidth > 760,
    finish:0, size:'Standard', quantity:1, galleryIndex:0, authMode:'login', checkout:{step:1,contact:{},delivery:'standard'},
  };
  state.cart = Array.isArray(state.cart) ? state.cart.filter(l => getProduct(l.id) && l.quantity > 0).map(l => ({...l,quantity:Math.min(99,Math.floor(l.quantity))})) : [];
  state.wishlist = Array.isArray(state.wishlist) ? state.wishlist.filter(id => getProduct(id)) : [];
  state.orders = Array.isArray(state.orders) ? state.orders : [];
  state.recent = Array.isArray(state.recent) ? state.recent.filter(id => getProduct(id)) : [];
  const finishes = ['Collection original', 'Natural oak concept', 'Smoked walnut concept'];
  let focusBeforeOverlay, toastTimer, menuTimer;
  let currentRoute = [];
  const main = $('#main');
  const itemPrice = line => (getProduct(line.id)?.price || 0) + (line.size === 'Extended' ? 400 : 0);
  const cartCount = () => state.cart.reduce((sum, l) => sum + l.quantity, 0);
  const totals = (delivery = state.checkout.delivery) => {
    const subtotal = state.cart.reduce((sum, line) => sum + itemPrice(line) * line.quantity, 0);
    const discount = state.promo === 'CASA10' ? Math.round(subtotal * .1) : 0;
    const shipping = !subtotal ? 0 : delivery === 'white-glove' ? 149 : subtotal >= 5000 ? 0 : 89;
    return {subtotal,discount,shipping,total:subtotal-discount+shipping};
  };
  function persistCart() { storage.write('cart', state.cart); renderHeader(); }
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
  const link = (href, label, className = '') => `<a href="#/${href}" class="${className}">${label}</a>`;
  const textLink = (href, label) => link(href, `${label}${icon('arrow')}`, 'text-link');
  const categoryLink = c => link(`collection/${c.id}`, esc(c.name));
  // 所有图片共用本地替代图；加载失败时展示相近场景，避免菜单、详情或购物车留下破图。
  const image = (src, alt, extra = '') => `<img src="${esc(src || assets.living)}" alt="${esc(alt)}" data-fallback="${esc(assets.living)}" ${extra}>`;
  function breadcrumb(items) { return `<div class="breadcrumbs">${link('', 'Home')}${items.map(([label,path]) => `<span>/</span>${path ? link(path,esc(label)) : `<span>${esc(label)}</span>`}`).join('')}</div>`; }
  function renderHeader() {
    $('#site-header').innerHTML = `<div class="announcement">A considered home, room by room.${link('collection/all','Explore the collection →')}</div>
      <header class="header"><div class="masthead wrap">
        <div class="header-left"><button class="icon-btn mobile-only" aria-label="Open navigation" data-action="mobile-menu">${icon('menu')}</button>${link('about','Our story')}${link('contact','Design assistance')}</div>
        <a href="#/" class="wordmark" aria-label="KLF CASA Home">KLF CASA<small>THE ART OF LIVING WELL</small></a>
        <div class="header-right"><button class="icon-btn" data-action="search" aria-label="Search products">${icon('search')}</button><a href="#/wishlist" class="icon-btn desktop-only" aria-label="Saved items">${icon('heart')}</a><button class="icon-btn desktop-only" data-action="account" aria-label="${state.user ? 'My account' : 'Sign in'}">${icon('user')}</button><button class="icon-btn header-count" data-action="cart" aria-label="Shopping bag, ${cartCount()} items">${icon('bag')}<span>${cartCount()}</span></button></div>
      </div><nav class="desktop-nav" aria-label="Main navigation">${categories.slice(0,7).map(c => `<button class="nav-item" data-menu="${c.id}" aria-expanded="${state.menu === c.id}" aria-controls="mega-menu">${esc(c.short)}</button>`).join('')}<button class="nav-item" data-menu="more" aria-expanded="${state.menu === 'more'}" aria-controls="mega-menu">More</button>${link('journal','The Journal','nav-item accent')}${link('join','Join Us','nav-item')}</nav><div id="mega-slot">${state.menu ? megaMenu(state.menu) : ''}</div></header>`;
  }
  function megaMenu(id) {
    const category = getCategory(id) || categories[9];
    const picks = products.filter(p => p.category === category.id).slice(0,4);
    return `<div class="mega" id="mega-menu"><div><span class="eyebrow">Thoughtfully at home</span><h3>${esc(category.name)}</h3><p>${esc(category.copy)}</p>${textLink(`collection/${category.id}`,'Explore all')}</div><div class="mega-col"><strong>Discover the collection</strong>${picks.map(p => link(`product/${p.id}`,esc(p.name.replace(/ System$/,'')))).join('')}${link(`collection/${category.id}`,'View the full collection →')}</div><div class="mega-col"><strong>Explore more rooms</strong>${(id === 'more' ? categories.slice(7) : categories.filter(c => c.id !== id).slice(0,5)).map(categoryLink).join('')}${link('collection/all','All 67 products')}${link('contact','Find your perfect fit')}</div><a class="mega-image" href="#/collection/${category.id}">${image(assets[category.image],category.name)}<span>A new perspective on ${category.short.toLowerCase()} ${icon('arrow')}</span></a></div>`;
  }
  function renderFooter() {
    $('#site-footer').innerHTML = `<section class="newsletter"><div><span class="eyebrow">A little inspiration, delivered</span><h2>Make yourself at home.</h2><p>Collection stories, considered spaces, and fresh perspectives.</p></div><form data-form="newsletter"><label class="sr-only" for="newsletter-email">Your email address</label><input id="newsletter-email" name="email" type="email" placeholder="Your email address" required autocomplete="email"><button aria-label="Subscribe">${icon('arrow')}</button></form></section>
      <footer class="footer"><div class="footer-grid wrap"><div class="footer-brand"><a href="#/" class="wordmark">KLF CASA<small>THE ART OF LIVING WELL</small></a><p>Thoughtful furniture. Considered spaces.<br>A home that feels like you.</p><span class="demo-note">Independent storefront concept. All prices, delivery options and checkout actions are demonstrations. No real payment or purchase takes place.</span></div><div class="footer-column"><h4>Explore</h4>${link('collection/all','All collections')}${categories.slice(0,4).map(categoryLink).join('')}${link('journal','The Journal')}</div><div class="footer-column"><h4>How can we help?</h4>${link('contact','Contact & design assistance')}${link('shipping','Shipping & delivery')}${link('returns','Returns & cancellations')}${link('faq','Frequently asked questions')}${link('account','My orders')}${link('wishlist','Saved items')}</div><div class="footer-column"><h4>Our world</h4>${link('about','Our story')}${link('trade','For design professionals')}${link('join','Become a partner')}${link('materials','Materials & care')}${link('privacy','Privacy & demo information')}<a href="https://www.klfcasa.com/" target="_blank" rel="noopener noreferrer">Original KLF CASA website ↗</a></div></div><div class="footer-bottom wrap"><span>© ${new Date().getFullYear()} KLF CASA · Independent design concept</span><span>United States · USD $ &nbsp;&nbsp; Product photography: KLF CASA</span></div></footer>`;
  }
  function card(product, index = 0) {
    const saved = state.wishlist.includes(product.id);
    return `<article class="product-card"><a class="product-photo" href="#/product/${product.id}">${image(product.images[0],product.name,'loading="lazy" decoding="async"')}${product.images[1] ? image(product.images[1],product.name + ' alternate view','class="alt-image" loading="lazy" decoding="async"') : ''}${index === 0 ? '<span class="product-tag">Considered design</span>' : ''}</a><button class="save-btn ${saved ? 'saved' : ''}" data-action="save" data-id="${product.id}" aria-label="${saved ? 'Remove from' : 'Add to'} saved items" aria-pressed="${saved}">${icon('heart')}</button><div class="product-meta"><div class="category">${esc(getCategory(product.category)?.name || product.categoryName)}</div><h3>${link(`product/${product.id}`,esc(product.name))}</h3><div class="product-bottom"><span>From ${money(product.price)}</span><span class="tiny-swatches" aria-label="Concept finish palette"><i></i><i></i><i></i></span></div></div></article>`;
  }
  function homePage() {
    const featured = ['living-room-system','bedroom-system','tea-cabinet-system','closet-system'].map(id => products.find(p => p.category === id && /Italian|Modern|Minimalist/i.test(p.name)) || products.find(p => p.category === id)).filter(Boolean);
    return `<section class="hero">${image(assets.hero,'Warm, sunlit KLF CASA living room with a sculptural cream sofa','fetchpriority="high"')}<div class="hero-content"><span class="eyebrow">The considered home · Collection 2026</span><h1>Beautiful living.<br><em>Quietly considered.</em></h1><p>Furniture and spaces with a sense of belonging. Made for the moments that make a home.</p>${link('collection/all',`Discover the collection ${icon('arrow')}`,'btn light')}</div><div class="hero-bottom"><span>TIMELESS SPACES. EVERYDAY RITUALS.</span><span>01 — THE LIVING COLLECTION</span></div></section>
      <div class="promise-strip"><div>${icon('craft')}Considered in every detail</div><div>${icon('leaf')}A natural sense of home</div><div>${icon('globe')}A collection for every room</div><div>${icon('box')}Discover 67 original designs</div></div>
      <section class="section wrap"><div class="section-heading"><div><span class="eyebrow">Find your sense of place</span><h2>Every room. Your story.</h2></div>${textLink('collection/all','Explore all rooms')}</div><div class="room-grid">${categories.slice(0,4).map(c => `<a class="room-card" href="#/collection/${c.id}"><div class="room-photo">${image(assets[c.image],c.name,'loading="lazy"')}</div><div class="room-caption"><h3>${esc(c.short)}</h3>${icon('arrow')}</div></a>`).join('')}</div></section>
      <section class="intro"><span class="eyebrow">A home, thoughtfully composed</span><h2>Good design feels effortless.<br>Great design feels like <em>you.</em></h2><p>From the first welcome to the quietest corner, discover a collection that brings warmth, balance, and a little beauty to the everyday.</p></section>
      <section class="featured section"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">A closer look</span><h2>Considered from every angle.</h2></div>${textLink('collection/all','Shop the collection')}</div><div class="product-grid four">${featured.map(card).join('')}</div><p class="price-note">Illustrative USD prices for this shopping demo. Original made-to-measure collections are priced by enquiry.</p></div></section>
      <section class="story-split">${image(assets.dining,'KLF CASA dining space with warm natural textures','loading="lazy"')}<div class="story-copy"><span class="eyebrow">Spaces with soul</span><h2>Room for the<br>way you live.</h2><p>A welcoming table. A place for your favourite things. An unhurried moment. Explore living, dining, and storage collections that feel beautifully connected.</p>${textLink('collection/tea-cabinet-system','Gather around')}</div></section>
      <section class="section wrap"><div class="section-heading"><div><span class="eyebrow">Notes on living well</span><h2>The Journal</h2></div>${textLink('journal','All stories')}</div>${journalCards()}</section>`;
  }
  const journalItems = [
    {id:'quiet-living',title:'The beauty of a quieter living room',tag:'At home',image:'living',description:'Balance, texture, and the art of leaving a little room.',category:'living-room-system'},
    {id:'personal-retreat',title:'A bedroom, a personal retreat',tag:'A considered space',image:'bedroom',description:'Make space for rest with a softer approach to interiors.',category:'bedroom-system'},
    {id:'everyday-rituals',title:'Gathering around the everyday',tag:'Everyday rituals',image:'tea',description:'Bring intention to the places where you come together.',category:'tea-cabinet-system'}
  ];
  function journalCards() { return `<div class="journal-grid">${journalItems.map(j => `<a href="#/journal/${j.id}" class="journal-card">${image(assets[j.image],j.title,'loading="lazy"')}<span class="eyebrow">${j.tag}</span><h3>${j.title}</h3><p>${j.description}</p></a>`).join('')}</div>`; }
  function collectionPage(id = 'all', search = '') {
    const category = getCategory(id);
    let list = category ? products.filter(p => p.category === id) : [...products];
    if (search) list = list.filter(p => `${p.name} ${p.categoryName} ${p.description}`.toLowerCase().includes(search.toLowerCase()));
    if (state.priceFilter.length) list = list.filter(p => state.priceFilter.some(f => f === 'under' ? p.price < 2500 : f === 'mid' ? p.price >= 2500 && p.price <= 4500 : p.price > 4500));
    if (state.styleFilter.length) list = list.filter(p => state.styleFilter.some(f => p.name.toLowerCase().includes(f)));
    if (state.sort === 'price-up') list.sort((a,b) => a.price - b.price);
    if (state.sort === 'price-down') list.sort((a,b) => b.price - a.price);
    if (state.sort === 'name') list.sort((a,b) => a.name.localeCompare(b.name));
    const pages = Math.max(1, Math.ceil(list.length/18)); state.page = Math.min(state.page,pages);
    const title = search ? `Results for “${search}”` : category?.name || 'The whole collection';
    return `<div class="wrap">${breadcrumb([[search ? 'Search' : 'Collections',category ? 'collection/all' : null],...(category ? [[category.name,null]] : [])])}<header class="collection-heading"><div><span class="eyebrow">Thoughtfully selected. Beautifully connected.</span><h1>${esc(title)}</h1></div><p>${esc(category?.copy || 'Explore all 67 original KLF CASA designs, across 10 collections. From individual spaces to a complete vision for your home.')}</p></header><nav class="collection-tabs" aria-label="Product categories">${link('collection/all','All designs',!category ? 'active' : '')}${categories.map(c => link(`collection/${c.id}`,esc(c.short),c.id === id ? 'active' : '')).join('')}</nav>${category ? `<div class="collection-banner">${image(assets[category.image],category.name)}<span>A place to ${category.id === 'bedroom-system' ? 'unwind.' : category.id === 'tea-cabinet-system' ? 'come together.' : 'call your own.'}</span></div>` : ''}<div class="collection-toolbar"><button class="filter-trigger" data-action="filters" aria-expanded="${state.filtersVisible}">${icon('filter')} ${state.filtersVisible ? 'Hide' : 'Show'} filters</button><span>${list.length} designs</span><label><span class="sr-only">Sort products</span><select id="sort-products">${[['featured','Featured'],['price-up','Price: low to high'],['price-down','Price: high to low'],['name','Name: A to Z']].map(([v,n]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><div class="catalog-layout ${state.filtersVisible ? '' : 'no-filter'}">${state.filtersVisible ? filtersMarkup() : ''}<div>${list.length ? `<div class="product-grid">${list.slice((state.page-1)*18,state.page*18).map(card).join('')}</div>` : emptyState('No designs found','Try another search or clear your filters.','Clear filters','clear-filters')}${pages > 1 ? `<nav class="pagination" aria-label="Product pages">${Array.from({length:pages},(_,i) => `<button data-action="page" data-page="${i+1}" class="${state.page === i+1 ? 'active' : ''}" aria-label="Page ${i+1}" ${state.page === i+1 ? 'aria-current="page"' : ''}>${i+1}</button>`).join('')}</nav>` : ''}<p class="price-note">Prices are illustrative estimates for this static concept. Actual collection pricing and specifications are available from KLF CASA by enquiry.</p></div></div></div><div class="section"></div>`;
  }
  function filtersMarkup() {
    const check = (value,label,group) => `<label class="check-row"><input type="checkbox" data-filter="${group}" value="${value}" ${state[group].includes(value) ? 'checked' : ''}>${label}</label>`;
    return `<aside class="filters" aria-label="Filter designs"><h4>Illustrative price</h4>${check('under','Under $2,500','priceFilter')}${check('mid','$2,500 – $4,500','priceFilter')}${check('over','Over $4,500','priceFilter')}<h4>Design language</h4>${check('italian','Italian-inspired','styleFilter')}${check('modern','Modern','styleFilter')}${check('minimal','Minimalist','styleFilter')}${check('chinese','New Chinese','styleFilter')}<button data-action="clear-filters">Clear all filters</button></aside>`;
  }
  function emptyState(title, copy, actionLabel = 'Explore the collection', action = 'shop') { return `<div class="empty-state">${image(assets.living,'KLF CASA living room inspiration','class="empty-state-image"')}<h2>${title}</h2><p>${copy}</p><button class="btn" data-action="${action}">${actionLabel}${icon('arrow')}</button></div>`; }
  function productPage(id) {
    const p = getProduct(id); if (!p) return notFound();
    const c = getCategory(p.category);
    const description = p.description || `${p.name} is part of the original KLF CASA ${c?.name.toLowerCase() || 'home'} collection. Explore the original photography and consider how this design could fit into your home.`;
    const related = products.filter(item => item.category === p.category && item.id !== p.id).slice(0,3);
    state.recent = [id,...state.recent.filter(r => r !== id)].slice(0,8); storage.write('recent',state.recent);
    return `<div class="wrap">${breadcrumb([['Collections','collection/all'],[c?.name || p.categoryName,`collection/${p.category}`],[p.name,null]])}<section class="product-detail"><div class="gallery">${image(p.images[state.galleryIndex] || p.images[0],p.name,'class="gallery-main" data-action="lightbox" data-id="' + p.id + '" tabindex="0" role="button" aria-label="Enlarge product image"')}<div class="gallery-thumbs">${p.images.map((src,i) => `<button class="${state.galleryIndex === i ? 'selected' : ''}" data-action="gallery" data-index="${i}" aria-label="View product image ${i+1}" aria-pressed="${state.galleryIndex === i}">${image(src,p.name + ' view ' + (i+1))}</button>`).join('')}</div></div><div class="product-info"><span class="eyebrow">${esc(c?.name || p.categoryName)} · KLF CASA</span><h1>${esc(p.name)}</h1><div class="pdp-price">${money(p.price + (state.size === 'Extended' ? 400 : 0))}<small>Illustrative price · USD</small></div><p class="lead">${esc(description)}</p><div class="divider"></div><div class="option-label">Concept finish <span id="finish-name">${finishes[state.finish]}</span></div><div class="finish-swatches">${['#c8b697','#a78b66','#69513f'].map((tone,i) => `<button style="--tone:${tone}" class="${state.finish === i ? 'selected' : ''}" aria-label="${finishes[i]}" aria-pressed="${state.finish === i}" data-action="finish" data-index="${i}"></button>`).join('')}</div><label class="option-label" for="product-size">Configuration</label><select class="option-select" id="product-size"><option ${state.size === 'Standard' ? 'selected' : ''}>Standard</option><option ${state.size === 'Extended' ? 'selected' : ''}>Extended</option></select><p class="form-note">Finish and configuration choices illustrate the shopping experience. Photographs show the original collection; alternate finishes are not rendered.</p><div class="add-row"><div class="quantity"><button data-action="pdp-qty" data-delta="-1" aria-label="Decrease quantity" ${state.quantity <= 1 ? 'disabled' : ''}>−</button><span>${state.quantity}</span><button data-action="pdp-qty" data-delta="1" aria-label="Increase quantity" ${state.quantity >= 99 ? 'disabled' : ''}>+</button></div><button class="btn" data-action="add-cart" data-id="${p.id}">Add to bag ${icon('arrow')}</button><button class="icon-btn" data-action="save" data-id="${p.id}" aria-label="Save this design" aria-pressed="${state.wishlist.includes(p.id)}">${icon('heart')}</button></div><div class="inline-service">${icon('truck')}Delivery options calculated at checkout</div><div class="inline-service">${icon('craft')}${link('contact','Need a different fit? Talk to our design team →')}</div><div class="accordions"><details open><summary>The details</summary><p>${esc(description)}</p>${p.details?.length ? `<ul>${(Array.isArray(p.details) ? p.details : [p.details]).map(d => `<li>${esc(typeof d === 'string' ? d : JSON.stringify(d))}</li>`).join('')}</ul>` : '<p>Dimensions, materials and made-to-measure options are confirmed by enquiry. No unverified specifications are shown.</p>'}</details><details><summary>Delivery & installation</summary><p>Preview standard or white-glove delivery at checkout. Actual made-to-order lead times, assembly and installation are confirmed with the manufacturer.</p>${textLink('shipping','About delivery')}</details><details><summary>Care & materials</summary><p>Use a soft, dry cloth for everyday dusting. Confirm the original finish and its care instructions with KLF CASA before using cleaners.</p>${textLink('materials','Read the care guide')}</details></div><a class="source-link" href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">View the original product at KLF CASA ↗</a></div></section></div>${related.length ? `<section class="featured section"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">In good company</span><h2>A beautifully connected room.</h2></div>${textLink(`collection/${p.category}`,'View collection')}</div><div class="product-grid">${related.map(card).join('')}</div></div></section>` : ''}`;
  }
  function lineMarkup(line, index, editable = true) {
    const p = getProduct(line.id); if (!p) return '';
    return `<div class="line-item"><a href="#/product/${p.id}">${image(p.images[0],p.name)}</a><div class="line-info"><h3>${link(`product/${p.id}`,esc(p.name))}</h3><p>${esc(finishes[line.finish || 0])} · ${esc(line.size || 'Standard')}</p><strong>${money((line.unitPrice ?? itemPrice(line)) * line.quantity)}</strong>${editable ? `<div class="line-actions"><div class="quantity"><button data-action="cart-qty" data-index="${index}" data-delta="-1" aria-label="Decrease ${esc(p.name)} quantity" ${line.quantity <= 1 ? 'disabled' : ''}>−</button><span>${line.quantity}</span><button data-action="cart-qty" data-index="${index}" data-delta="1" aria-label="Increase ${esc(p.name)} quantity" ${line.quantity >= 99 ? 'disabled' : ''}>+</button></div><button class="remove" data-action="remove-line" data-index="${index}">Remove</button></div>` : `<p>Quantity ${line.quantity}</p>`}</div></div>`;
  }
  function totalsMarkup(t) { return `<div class="total-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>${t.discount ? `<div class="total-row"><span>Welcome discount · 10%</span><span>−${money(t.discount)}</span></div>` : ''}<div class="total-row"><span>Delivery</span><span>${t.shipping ? money(t.shipping) : 'Complimentary'}</span></div><div class="total-row"><span>Tax</span><span>Not charged in demo</span></div><div class="total-row grand"><span>Total <small>USD</small></span><strong>${money(t.total)}</strong></div>`; }
  function promoMarkup() { return `<form class="promo-form" data-form="promo"><label class="sr-only" for="promo-code">Promo code</label><input id="promo-code" name="code" placeholder="Gift or promo code" value="${state.promo}" autocomplete="off"><button>Apply</button></form><p class="form-note">Try CASA10 for a 10% demo discount.</p>`; }
  function cartPage() { return `<div class="wrap">${breadcrumb([['Your bag',null]])}<header class="page-title"><span class="eyebrow">Make room for something beautiful</span><h1>Your shopping bag (${cartCount()})</h1></header>${state.cart.length ? `<div class="cart-layout"><div>${state.cart.map((l,i) => lineMarkup(l,i)).join('')}<div style="margin-top:25px">${textLink('collection/all','Continue exploring')}</div></div><aside class="summary-box"><h3>Order summary</h3>${totalsMarkup(totals('standard'))}${promoMarkup()}${link('checkout',`Continue to checkout ${icon('arrow')}`,'btn wide')}<p class="form-note" style="margin-top:14px">Static shopping demo. No charge will be made. Delivery and prices shown are illustrative.</p></aside></div>` : emptyState('Your next chapter starts here.','Discover pieces and spaces to make yourself at home.')}</div>`; }
  function savedPage() { const saved = state.wishlist.map(getProduct).filter(Boolean); return `<div class="wrap">${breadcrumb([['Saved designs',null]])}<header class="page-title"><span class="eyebrow">Keep a little inspiration</span><h1>Your saved designs</h1><p>${saved.length} ${saved.length === 1 ? 'design' : 'designs'} to come back to.</p></header>${saved.length ? `<div class="product-grid">${saved.map(card).join('')}</div><div class="section"></div>` : emptyState('A space for your favourites.','Tap the heart on a design to keep it here for later.')}</div>`; }
  function field(label,name,type='text',value='',extra='') { return `<label class="field">${label}<input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`; }
  function checkoutPage() {
    if (!state.cart.length) return `<div class="wrap">${emptyState('Your bag is waiting.','Add a design to preview the checkout experience.')}</div>`;
    const step = state.checkout.step, contact = state.checkout.contact;
    let form;
    if (step === 1) form = `<form class="checkout-form" data-form="checkout-contact"><h2>Where should we send it?</h2><p class="form-note">Preview checkout with example details. No information is sent to a server.</p>${field('Email address','email','email',contact.email || state.user?.email || '', 'required autocomplete="email"')}${!state.user ? '<button type="button" class="form-back" data-action="login">Already have a demo account? Sign in</button>' : ''}<div class="field-pair">${field('First name','firstName','text',contact.firstName || state.user?.name || '', 'required autocomplete="given-name"')}${field('Last name','lastName','text',contact.lastName || '', 'required autocomplete="family-name"')}</div>${field('Street address','address','text',contact.address || '', 'required autocomplete="street-address"')}${field('Apartment, suite, etc. (optional)','apartment','text',contact.apartment || '')}<div class="field-pair">${field('City','city','text',contact.city || '', 'required autocomplete="address-level2"')}${field('State / region','region','text',contact.region || '', 'required autocomplete="address-level1"')}</div><div class="field-pair">${field('ZIP / postal code','postal','text',contact.postal || '', 'required autocomplete="postal-code"')}<label class="field">Country<select name="country"><option ${contact.country === 'United States' ? 'selected' : ''}>United States</option><option ${contact.country === 'Canada' ? 'selected' : ''}>Canada</option><option ${contact.country === 'United Kingdom' ? 'selected' : ''}>United Kingdom</option><option ${contact.country === 'Australia' ? 'selected' : ''}>Australia</option><option ${contact.country === 'Other' ? 'selected' : ''}>Other</option></select></label></div><button class="btn">Continue to delivery ${icon('arrow')}</button></form>`;
    else if (step === 2) form = `<form class="checkout-form" data-form="checkout-delivery"><h2>A considered arrival.</h2><p class="form-note">Delivering to ${esc(contact.firstName)}, ${esc(contact.address)}, ${esc(contact.city)}.</p><label class="radio-option"><input type="radio" name="delivery" value="standard" ${state.checkout.delivery === 'standard' ? 'checked' : ''}><span>Standard delivery<small>Doorstep delivery · estimated 3–6 weeks for demo</small></span><strong>${totals('standard').shipping ? money(89) : 'Free'}</strong></label><label class="radio-option"><input type="radio" name="delivery" value="white-glove" ${state.checkout.delivery === 'white-glove' ? 'checked' : ''}><span>White-glove delivery<small>Room-of-choice placement · illustrative service</small></span><strong>$149</strong></label><p class="form-note">These choices demonstrate the flow. Actual availability and lead times require confirmation.</p><button class="btn">Continue to review ${icon('arrow')}</button><button type="button" class="form-back" data-action="checkout-step" data-step="1">← Back to information</button></form>`;
    else form = `<form class="checkout-form" data-form="place-order"><h2>One last look.</h2><div class="order-card"><header><strong>Contact & delivery</strong><button type="button" class="remove" data-action="checkout-step" data-step="1">Edit</button></header><p>${esc(contact.firstName)} ${esc(contact.lastName)}<br>${esc(contact.email)}<br>${esc(contact.address)} ${esc(contact.apartment)}<br>${esc(contact.city)}, ${esc(contact.region)} ${esc(contact.postal)}<br>${esc(contact.country)}</p><strong>${state.checkout.delivery === 'white-glove' ? 'White-glove delivery' : 'Standard delivery'}</strong></div><label class="radio-option"><input type="radio" checked name="payment" value="demo"><span>Demo payment<small>Simulated approval. No bank or card details required.</small></span>${icon('lock')}</label><div class="checkout-safe">${icon('check')} This is a local shopping demonstration. Placing this order creates an example order in this browser only; no real payment, reservation or shipment is made.</div><label class="check-row"><input type="checkbox" required>I understand this is a demonstration order.</label><button class="btn">Place demo order · ${money(totals().total)} ${icon('arrow')}</button><button type="button" class="form-back" data-action="checkout-step" data-step="2">← Back to delivery</button></form>`;
    return `<div class="wrap">${breadcrumb([['Your bag','cart'],['Checkout',null]])}<header class="page-title"><span class="eyebrow">A little closer to home</span><h1>Checkout</h1></header><div class="checkout-layout"><div><nav class="checkout-steps" aria-label="Checkout progress">${['Information','Delivery','Review & pay'].map((n,i) => `<span class="${step === i+1 ? 'active' : step > i+1 ? 'done' : ''}">${i+1}. ${n}</span>${i < 2 ? '<span>→</span>' : ''}`).join('')}</nav>${form}</div><aside class="summary-box"><h3>Your considered choices</h3>${state.cart.map((l,i) => lineMarkup(l,i,false)).join('')}${totalsMarkup(totals())}${promoMarkup()}<p class="form-note" style="margin-top:20px">All amounts are demonstration estimates.</p></aside></div></div>`;
  }
  function orderPage(id) {
    const order = state.orders.find(o => o.id === id); if (!order) return notFound();
    return `<div class="wrap"><section class="confirmation"><div class="check-circle">${icon('check')}</div><span class="eyebrow">${order.cancelled ? 'Demo order cancelled' : 'Your new chapter begins'}</span><h1>${order.cancelled ? 'A change of plans.' : 'A beautiful choice.'}</h1><p>${order.cancelled ? 'This example order has been cancelled in your browser.' : `Thank you, ${esc(order.contact.firstName)}. Your demonstration order is confirmed and saved in this browser.`}</p><strong>Order ${esc(order.id)}</strong><div class="order-timeline"><div class="active">${order.cancelled ? 'Cancelled' : 'Order confirmed'}<br><small>${new Date(order.created).toLocaleDateString('en-US')}</small></div><div>Preparation<br><small>Demo preview only</small></div><div>Delivery<br><small>No real shipment</small></div></div><div class="summary-box"><h3>Your order</h3>${order.lines.map((l,i) => lineMarkup(l,i,false)).join('')}${totalsMarkup(order.totals)}<div class="divider"></div><p class="form-note">${esc(order.contact.firstName)} ${esc(order.contact.lastName)} · ${esc(order.contact.email)}<br>${esc(order.contact.address)}, ${esc(order.contact.city)}<br>${esc(order.delivery === 'white-glove' ? 'White-glove delivery' : 'Standard delivery')} · Simulated payment</p></div><div class="confirmation-actions">${link('collection/all','Continue exploring','btn')}${link('account','View my orders','btn outline')}${!order.cancelled ? `<button class="btn outline" data-action="cancel-order" data-id="${esc(order.id)}">Cancel demo order</button>` : ''}</div><p class="form-note">No real order has been sent to KLF CASA. No payment has been collected.</p></section></div>`;
  }
  function accountPage() {
    if (!state.user) return `<div class="wrap">${breadcrumb([['My account',null]])}${emptyState('Welcome home.','Sign in to your local demo profile to see your orders and continue your collection.','Sign in / create demo profile','login')}</div>`;
    const orders = state.orders.filter(o => o.contact.email.toLowerCase() === state.user.email.toLowerCase());
    return `<div class="wrap">${breadcrumb([['My account',null]])}<header class="page-title"><span class="eyebrow">Your personal corner</span><h1>Welcome, ${esc(state.user.name)}.</h1><p>${esc(state.user.email)} · Demo profile</p></header><div class="account-layout"><div><h2 style="font-size:31px">Your orders</h2>${orders.length ? orders.map(o => `<article class="order-card"><header><strong>${esc(o.id)}</strong><span class="status">${o.cancelled ? 'Cancelled' : 'Confirmed · demo'}</span></header><p>${new Date(o.created).toLocaleDateString('en-US')} · ${o.lines.reduce((s,l) => s+l.quantity,0)} items · ${money(o.totals.total)}</p><div class="order-products">${o.lines.slice(0,5).map(l => {const p = getProduct(l.id); return p ? image(p.images[0],p.name) : '';}).join('')}</div>${textLink(`order/${o.id}`,'View order details')}</article>`).join('') : '<p style="margin:20px 0 30px">Your first considered choice is still to come.</p>'}${textLink('collection/all','Explore the collection')}</div><aside class="summary-box"><h3>At your fingertips</h3><p style="font-size:12px;margin-bottom:20px">Your profile and orders stay on this device. This concept does not connect to the original store’s account system.</p><div style="margin:15px 0">${textLink('wishlist',`Saved designs (${state.wishlist.length})`)}</div><div style="margin:15px 0">${textLink('contact','Design assistance')}</div><button class="btn outline wide" data-action="logout">Sign out</button></aside></div></div>`;
  }
  const infoPages = {
    about:{title:'A more considered home.',eyebrow:'The KLF CASA perspective',image:'living',intro:'Good interiors begin with the way you live. This collection brings together furniture, cabinetry, and whole-home systems from the original KLF CASA catalogue.',sections:[['Room for everyday life','A welcoming entryway, a place to gather, a personal retreat. Explore designs for every room and consider the small details that make those rooms your own.'],['A connected collection','Browse all 67 original designs across 10 categories, from living rooms and bedrooms to kitchens, wardrobes, and architectural surfaces. Product names, photography and available descriptions come from KLF CASA.'],['About this concept','This is an independent static storefront demonstration, exploring a different retail experience for the KLF CASA collection. Prices, selectable finishes, delivery services, and payment actions are illustrative. For real specifications, pricing and availability, contact the original manufacturer.']]},
    materials:{title:'Care is in the details.',eyebrow:'Materials & everyday care',image:'closet',intro:'A few thoughtful habits can help keep your home feeling its best. Always follow the care instructions supplied with the original product.',sections:[['Start gently','Dust regularly with a clean, soft cloth. Wipe accidental spills promptly and avoid abrasive pads, concentrated cleaners, and prolonged moisture. Confirm whether a surface is wood, veneer, laminate, glass or another material before treating it.'],['Consider the setting','Keep furniture away from strong direct heat and avoid prolonged, intense sunlight where possible. Use protective mats under hot objects and lift items rather than dragging them across a finished surface.'],['Know your collection','The original catalogue includes a range of furniture and fitted systems. Material specifications and finish samples should be confirmed with KLF CASA for each design; this demo does not infer them from a photograph.']]},
    shipping:{title:'A thoughtful arrival.',eyebrow:'Shipping & delivery',image:'entryway',intro:'Explore how delivery choices could work in this concept store. All fees and time estimates shown here are illustrative.',sections:[['Standard delivery','The demo offers $89 standard delivery, complimentary on item subtotals of $5,000 or more. The sample 3–6 week estimate is part of the concept, and is not a manufacturer promise.'],['White-glove delivery','Choose the $149 example service at checkout to preview room-of-choice placement. Actual assembly, fitting and installation requirements depend on the product and must be confirmed separately.'],['Prepare your space','Measure your access route, doorways, staircases and intended room before ordering real furniture. For fitted cabinetry and whole-home systems, arrange a professional survey and confirm the installation scope with the supplier.']]},
    returns:{title:'Space to reconsider.',eyebrow:'Returns & cancellations',image:'bedroom',intro:'The concept lets you review or cancel a demonstration order from your account or its confirmation page.',sections:[['Demonstration orders','Any cancellation in this demo only changes a local example record. It does not contact KLF CASA, trigger a refund, or alter any real order.'],['For an actual purchase','Custom furniture and made-to-measure installations may have specific cancellation and return conditions. Obtain written confirmation of those conditions from the original seller before placing a real order.'],['Need assistance?','Use the design enquiry form to preview the customer support experience. The form saves an acknowledgement locally; it does not send an email. Visit the original KLF CASA site to make an actual enquiry.']]},
    trade:{title:'A shared vision.',eyebrow:'For design professionals',image:'dining',intro:'Explore a whole-home collection for your next interior concept, from individual spaces to coordinated architectural details.',sections:[['A collection for your project','Discover living, bedroom, kitchen, wardrobe and entryway systems alongside doors, wall panels and supporting home solutions. Save your preferred designs and build a considered shortlist.'],['Start a conversation','The original KLF CASA website describes custom furniture manufacturing and OEM/ODM enquiries. Specific trade terms, quotations, product certifications and project services should be confirmed directly with the manufacturer.'],['Preview an enquiry','Use the contact page to explore the enquiry experience in this demo. No project information is transmitted to an external service.']]},
    privacy:{title:'A transparent demo.',eyebrow:'Privacy & concept information',image:'living',intro:'This static website is a local prototype. It does not process real payments, create a manufacturer account or submit real orders.',sections:[['What stays in your browser','Shopping bag contents, saved designs, demonstration profiles and order records are stored in your browser’s local storage when available. There is no account server. Never use a real password in a demo.'],['Forms and checkout','Search, newsletter, contact and checkout interactions are simulated locally. The site has no payment processor, email service or real delivery integration. Card numbers and banking credentials are not collected.'],['Images and product information','Product names and photography are sourced from the publicly accessible KLF CASA catalogue. This concept is independent of the original site. Prices, alternate finish choices and delivery estimates are sample content. The original product link on each detail page opens the manufacturer’s site.'],['Remove local demo data','You can remove all locally saved shopping and profile information with the button below. This only affects this browser and this demo.']]}
  };
  function infoPage(key) {
    const info = infoPages[key]; if (!info) return notFound();
    return `<section class="info-hero"><div class="info-hero-copy"><span class="eyebrow">${info.eyebrow}</span><h1>${info.title}</h1><p>${info.intro}</p></div>${image(assets[info.image],info.title)}</section><article class="article-body">${info.sections.map(([title,copy]) => `<h2>${title}</h2><p>${copy}</p>`).join('')}${key === 'privacy' ? '<button class="btn outline" data-action="clear-data">Clear local demo data</button>' : textLink('contact','Let’s talk about your space')}</article>`;
  }
  function journalPage(id) {
    if (!id) return `<div class="wrap">${breadcrumb([['The Journal',null]])}<header class="page-title"><span class="eyebrow">Notes on living well</span><h1>The Journal</h1><p>Fresh perspectives on the places we call home.</p></header>${journalCards()}<div class="section"></div></div>`;
    const j = journalItems.find(item => item.id === id); if (!j) return notFound();
    return `<section class="info-hero"><div class="info-hero-copy"><span class="eyebrow">The Journal · ${j.tag}</span><h1>${j.title}</h1><p>${j.description}</p></div>${image(assets[j.image],j.title)}</section><article class="article-body"><span class="eyebrow">A KLF CASA concept editorial</span><h2>Begin with the way you live.</h2><p>Think about the moments a room holds. The first coffee of the day. An evening conversation. A favourite book within reach. A considered space makes those moments feel easy, with room for the things that matter most to you.</p><h2>Find a sense of balance.</h2><p>Start with a simple palette. Let larger pieces establish the proportions, then bring in a different texture or a softer tone. Leave enough space to move, and let a few personal objects tell your story.</p><h2>See the room as a whole.</h2><p>The KLF CASA collection brings together furniture and fitted systems, with original room photography to help you explore the relationships between storage, seating, surfaces and architectural details. Save the designs you are drawn to, and consider them side by side.</p>${textLink(`collection/${j.category}`,'Explore the room')}</article>`;
  }
  function contactPage() { return `<div class="wrap">${breadcrumb([['Design assistance',null]])}<header class="page-title"><span class="eyebrow">A little guidance goes a long way</span><h1>Let’s make it feel like home.</h1></header><section class="contact-layout"><div><h2>Your space.<br>A shared conversation.</h2><p>Have a room in mind, a collection you love, or a question about the details? Tell us what you are imagining.</p>${image(assets.tea,'A considered KLF CASA dining and tea space','loading="lazy"')}<p class="form-note">This form demonstrates an enquiry experience. It does not send an email. For an actual quote, use the original KLF CASA website.</p><a class="text-link" href="https://www.klfcasa.com/contact.html" target="_blank" rel="noopener noreferrer">Contact the original manufacturer ↗</a></div><form class="contact-form" data-form="contact">${field('Your name','name','text',state.user?.name || '', 'required')}${field('Email address','email','email',state.user?.email || '', 'required')}<label class="field">What are you considering?<select name="topic"><option>Design assistance</option><option>Product details & dimensions</option><option>Trade & project enquiries</option><option>Delivery & installation</option><option>Other</option></select></label><label class="field">Tell us about your space<textarea name="message" placeholder="The room, the feeling, the details you love…" required minlength="10"></textarea></label><button class="btn">Preview enquiry ${icon('arrow')}</button><p class="form-note">Only a local acknowledgement is created.</p></form></section></div>`; }
  function faqPage() {
    const questions = [['Can I browse every original product?','Yes. This concept contains all 67 products displayed in the current KLF CASA product catalogue, grouped into 10 original categories. Different products with the same name retain their own product page and photography.'],['Are the prices and finishes real?','Prices and alternate finish selections are illustrative shopping demo content. Photographs and available descriptions come from the original catalogue. For a real quotation, specifications or finish sample, contact KLF CASA.'],['How does the shopping demo work?','Choose a configuration, add designs to your bag, review quantities, then step through contact information, delivery and a simulated payment. Your example order is stored in this browser. No charge is collected.'],['How do I sign in?','Open the account icon, enter an example email and any demo password of at least 6 characters. This creates a local demonstration session. It does not access or verify a real KLF CASA account, and the password is never saved.'],['Can I open this without a server?','Yes. Open index.html directly. All images, styling, product data and navigation work locally. Your browser may limit persistent storage for local files; in that case the current session still works.'],['Where can I see my order?','After the checkout flow, use the confirmation page or My account. Sign in with the same email used at checkout to see matching local example orders.'],['Can I cancel a demonstration order?','Yes. Open its order detail page and choose Cancel demo order. This only updates the record in this browser.']];
    return `<div class="wrap">${breadcrumb([['Frequently asked questions',null]])}<header class="page-title"><span class="eyebrow">A few helpful answers</span><h1>Good questions.</h1></header><div class="article-body" style="padding-top:0"><div class="accordions">${questions.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div><div style="margin-top:35px">${textLink('contact','Still curious? Talk to us')}</div></div></div>`;
  }
  // 加盟内容沿用站内图、版式与表单组件；具体商业条件留待确认，不套用参考品牌的数据或承诺。
  function joinPage() {
    const routes = [
      ['A considered showroom','Create a welcoming place to experience the collection, explore materials, and imagine a whole home.'],
      ['Retail & distribution','Explore how the collection could complement your local furniture or interiors business.'],
      ['Design & project collaboration','Bring a coordinated selection to residential interiors, hospitality concepts, and other considered spaces.']
    ];
    const fit = [
      ['A feel for interiors','Experience in furniture, cabinetry, interior design, or a related business is a helpful starting point.'],
      ['Local understanding','An understanding of your market, its customers, and the professionals who help them make a home.'],
      ['A thoughtful customer experience','A plan for design advice, sales, installation coordination, and ongoing customer care.'],
      ['A space and a vision','An existing showroom or a proposed location to discuss. Space, investment, and display requirements are reviewed together.']
    ];
    const process = [
      ['Share your vision','Tell us about your market, your experience, and the kind of partnership you have in mind.'],
      ['Explore the right fit','Discuss the collection, proposed location, business model, and practical delivery needs.'],
      ['Shape the next chapter','Confirm the agreed scope, commercial terms, showroom plan, and next steps before making a commitment.']
    ];
    return `<div class="partner-page"><section class="info-hero partner-hero"><div class="info-hero-copy"><span class="eyebrow">Join us · A shared vision</span><h1>Build something<br>lasting. <em>Together.</em></h1><p>For people who believe a beautiful home begins with thoughtful design. Explore a partnership with KLF CASA, and imagine what we could bring to your market.</p><button class="btn" data-action="join-apply">Become a partner</button></div>${image(assets.dining,'A welcoming KLF CASA interior with coordinated furniture and cabinetry','fetchpriority="high"')}</section>
      <section class="section wrap"><div class="section-heading"><div><span class="eyebrow">A collection. A world of possibilities.</span><h2>Room for a shared ambition.</h2></div><p>From a single space to a connected home, explore a collection with a considered point of view.</p></div><div class="partner-introduction"><p>KLF CASA brings together living, bedroom, kitchen, wardrobe, and architectural collections. The opportunity starts with finding the right fit between that collection, your experience, and your local market.</p><div class="partner-facts"><div><strong>${products.length}</strong><span>Original catalogue designs</span></div><div><strong>${categories.length}</strong><span>Connected collections</span></div><div><strong>Whole home</strong><span>A room-by-room perspective</span></div></div></div></section>
      <section class="featured section"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">Find your way forward</span><h2>More than one way to connect.</h2></div><p>These are starting points for a conversation. The appropriate partnership model is agreed individually.</p></div><div class="partner-grid">${routes.map(([title,copy],i) => `<article class="partner-card partner-photo-card">${image(assets[['living','kitchen','dining'][i]],title + ' · collection inspiration','loading="lazy"')}<h3>${title}</h3><p>${copy}</p></article>`).join('')}</div></div></section>
      <section class="story-split partner-fit">${image(assets.closet,'KLF CASA coordinated cabinetry and wardrobe display','loading="lazy"')}<div class="story-copy"><span class="eyebrow">The people behind the spaces</span><h2>A good partnership<br>starts with a good fit.</h2><div class="partner-fit-list">${fit.map(([title,copy]) => `<div><h3>${title}</h3><p>${copy}</p></div>`).join('')}</div></div></section>
      <section class="section wrap"><div class="section-heading"><div><span class="eyebrow">From first conversation to a clear plan</span><h2>A thoughtful beginning.</h2></div></div><div class="partner-grid partner-process">${process.map(([title,copy]) => `<article class="partner-card"><h3>${title}</h3><p>${copy}</p></article>`).join('')}</div><p class="partner-note">Investment, territory, exclusivity, showroom size, launch timing, and any support package are subject to direct discussion and written agreement. This concept page does not establish franchise terms.</p></section>
      <section class="featured section"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">The practical side of a shared vision</span><h2>Let’s talk about the details.</h2></div><p>Topics to explore when shaping your partnership.</p></div><div class="partner-grid partner-topics">${[['Collection & product planning','Identify the rooms and designs that make sense for your customers.'],['Showroom & display','Discuss the layout, sample selection, and visual presentation of a proposed space.'],['People & product knowledge','Clarify the product information and team preparation your business would need.'],['Delivery & local service','Map out ordering, logistics, installation coordination, and aftercare responsibilities.']].map(([title,copy],i) => `<article class="partner-card partner-photo-card">${image(assets[['kitchen','closet','tea','entryway'][i]],title + ' · collection inspiration','loading="lazy"')}<h3>${title}</h3><p>${copy}</p></article>`).join('')}</div></div></section>
      <section class="section wrap partner-questions"><div><span class="eyebrow">Before we begin</span><h2>A few helpful answers.</h2></div><div class="accordions"><details><summary>Do I need an existing showroom?</summary><p>You can start a conversation with an existing location or an early-stage proposal. Any showroom requirements and sample plan need to be confirmed directly.</p></details><details><summary>What is the investment or franchise fee?</summary><p>No fixed investment, fee, margin, or exclusive territory is quoted in this demo. Commercial terms depend on the agreed model, location, and scope.</p></details><details><summary>Can I enquire from outside the United States?</summary><p>Yes. Include your country and city in the form so the intended market is clear. Regional availability and logistics must be confirmed before proceeding.</p></details></div></section>
      <section class="featured" id="partner-application"><div class="section wrap partner-application"><div class="partner-application-copy"><span class="eyebrow">Your next chapter</span><h2>Let’s start<br>with your vision.</h2><p>Tell us a little about yourself, your business, and the place you have in mind. A few thoughtful details help make the first conversation a useful one.</p>${image(assets.tea,'KLF CASA furniture and cabinetry in a calm dining setting','loading="lazy"')}<p class="partner-note">This is a demonstration enquiry form. Submission shows a local acknowledgement; no application or personal information is sent to KLF CASA.</p></div><form class="contact-form partner-form" data-form="partnership"><div class="field-pair">${field('Full name *','name','text','','required minlength="2" maxlength="100" autocomplete="name"')}${field('Email address *','email','email','','required maxlength="160" autocomplete="email"')}</div><div class="field-pair">${field('Phone / WhatsApp *','phone','tel','','required minlength="6" maxlength="30" autocomplete="tel"')}${field('Company / business name','company','text','','maxlength="160" autocomplete="organization"')}</div><div class="field-pair">${field('Country / region *','country','text','','required maxlength="100" autocomplete="country-name"')}${field('City *','city','text','','required maxlength="100" autocomplete="address-level2"')}</div><label class="field">Partnership interest *<select name="interest" required><option value="">Please select</option><option>Showroom / franchise partnership</option><option>Retail & distribution</option><option>Design & project collaboration</option><option>Exploring the possibilities</option></select></label><div class="field-pair"><label class="field">Showroom status<select name="showroom"><option value="">Please select (optional)</option><option>Existing showroom</option><option>Location identified</option><option>Currently searching</option><option>Not part of my current plan</option></select></label><label class="field">Industry experience<select name="experience"><option value="">Please select (optional)</option><option>New to the industry</option><option>Less than 3 years</option><option>3–10 years</option><option>More than 10 years</option></select></label></div><label class="field">Tell us about your plans<textarea name="message" rows="5" maxlength="3000" placeholder="Your market, relevant experience, proposed space, and what you would like to create together…"></textarea></label><label class="check-row partner-consent"><input type="checkbox" name="consent" required><span>I have read the <a href="#/privacy" target="_blank" rel="noopener noreferrer">privacy & demo information (opens in a new tab)</a> and understand this form previews a partnership enquiry.</span></label><button class="btn" type="submit">Submit partnership enquiry</button><p class="partner-note">For a real application, contact the team through the <a href="https://www.klfcasa.com/contact.html" target="_blank" rel="noopener noreferrer">original KLF CASA website</a>.</p></form></div></section></div>`;
  }
  function notFound() { return `<div class="error-view"><span class="eyebrow">A little off the beaten path</span><h1>This space is still waiting.</h1><p>The page or product could not be found.</p>${link('collection/all','Explore the collection','btn')}</div>`; }
  function render() {
    closeOverlay(false); state.menu = null;
    let parts;
    try { parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent); } catch { parts = ['not-found']; }
    currentRoute = parts;
    const [route,id] = parts;
    renderHeader(); renderFooter();
    let html;
    if (!route || route === 'main') html = homePage();
    else if (route === 'collection') html = collectionPage(id || 'all');
    else if (route === 'search') html = collectionPage('all',id || '');
    else if (route === 'product') html = productPage(id);
    else if (route === 'cart') html = cartPage();
    else if (route === 'wishlist') html = savedPage();
    else if (route === 'checkout') html = checkoutPage();
    else if (route === 'account') html = accountPage();
    else if (route === 'order') html = orderPage(id);
    else if (route === 'journal') html = journalPage(id);
    else if (route === 'contact') html = contactPage();
    else if (route === 'join') html = joinPage();
    else if (route === 'faq') html = faqPage();
    else html = infoPages[route] ? infoPage(route) : notFound();
    main.innerHTML = html;
    const title = $('h1',main)?.textContent || 'A more considered home';
    document.title = `${title} — KLF CASA`;
  }
  function navigate(path) { const next = '#/' + path; if (location.hash === next) { render(); window.scrollTo({top:0,behavior:'instant'}); } else location.hash = next; }
  function renderCurrentContent() {
    const scroll = window.scrollY;
    main.innerHTML = currentRoute[0] === 'product' ? productPage(currentRoute[1]) : currentRoute[0] === 'collection' ? collectionPage(currentRoute[1]) : currentRoute[0] === 'search' ? collectionPage('all',currentRoute[1]) : currentRoute[0] === 'checkout' ? checkoutPage() : currentRoute[0] === 'cart' ? cartPage() : currentRoute[0] === 'wishlist' ? savedPage() : main.innerHTML;
    window.scrollTo(0,scroll);
  }
  function openOverlay(type, html) {
    const refreshing = state.overlay === type;
    const scrollTop = $('.drawer-content')?.scrollTop || 0;
    const previousControl = document.activeElement?.closest('[data-action]');
    const previousAction = refreshing ? previousControl?.dataset.action : null;
    const previousIndex = previousControl?.dataset.index;
    if (!state.overlay) focusBeforeOverlay = document.activeElement;
    state.overlay = type; document.body.classList.add('locked');
    // 背景不参与焦点导航；更新购物车数量时保留滚动位置，不重复播放抽屉滑入动画。
    for (const id of ['site-header','main','site-footer']) document.getElementById(id).inert = true;
    $('#overlay-root').classList.toggle('overlay-refresh',refreshing);
    $('#overlay-root').innerHTML = `<div class="overlay-shade" data-action="close-overlay"></div>${html}`;
    if (refreshing && $('.drawer-content')) $('.drawer-content').scrollTop = scrollTop;
    requestAnimationFrame(() => {
      // 数量控件更新后继续保留在同一操作，键盘和读屏用户无需重新从关闭按钮开始。
      const control = previousAction && [...$('#overlay-root').querySelectorAll('[data-action]')].find(el => el.dataset.action === previousAction && el.dataset.index === previousIndex);
      (control || $('#overlay-root input, #overlay-root button, #overlay-root a'))?.focus();
    });
  }
  function closeOverlay(restore = true) {
    if (!state.overlay) return;
    state.overlay = null; $('#overlay-root').innerHTML = ''; document.body.classList.remove('locked');
    for (const id of ['site-header','main','site-footer']) document.getElementById(id).inert = false;
    if (restore && focusBeforeOverlay?.isConnected) focusBeforeOverlay.focus();
  }
  function cartDrawer() {
    openOverlay('cart',`<aside class="drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag"><header class="drawer-head"><h2>Your bag <small>(${cartCount()})</small></h2><button class="icon-btn" data-action="close-overlay" aria-label="Close shopping bag">${icon('close')}</button></header><div class="drawer-content">${state.cart.length ? state.cart.map((l,i) => lineMarkup(l,i)).join('') : emptyState('A little room for inspiration.','Add a favourite design and make it your own.')}</div>${state.cart.length ? `<div class="drawer-bottom"><div class="total-row"><span>Subtotal</span><strong>${money(totals().subtotal)}</strong></div><p>Illustrative prices. Delivery calculated at checkout.</p>${link('checkout',`Checkout ${icon('arrow')}`,'btn wide')}<div style="text-align:center;margin-top:14px">${textLink('cart','View and edit your bag')}</div></div>` : ''}</aside>`);
  }
  function authModal(mode = 'login') {
    state.authMode = mode;
    openOverlay('auth',`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button class="icon-btn close" data-action="close-overlay" aria-label="Close sign in">${icon('close')}</button><span class="eyebrow">Your personal corner</span><h2 id="auth-title">${mode === 'register' ? 'Make yourself at home.' : mode === 'reset' ? 'A fresh start.' : 'Welcome home.'}</h2><p>${mode === 'register' ? 'Create a local demo profile for your considered choices.' : mode === 'reset' ? 'Preview the password-help experience.' : 'Sign in to explore your profile and example orders.'}</p><form data-form="auth">${mode === 'register' ? field('Your name','name','text','','required autocomplete="given-name"') : ''}${field('Email address','email','email','','required autocomplete="email"')}${mode !== 'reset' ? field('Demo password','password','password','','required minlength="6" autocomplete="off" placeholder="Any demo password, 6+ characters"') : ''}<button class="btn">${mode === 'register' ? 'Create demo profile' : mode === 'reset' ? 'Preview password help' : 'Sign in to demo'}</button><p class="form-note">Local demo only. Use an example email and password. No account is verified and no password is saved.</p></form><button class="form-switch" data-action="auth-switch" data-mode="${mode === 'register' ? 'login' : 'register'}">${mode === 'register' ? 'Already have a profile? Sign in' : 'New here? Create a demo profile'}</button>${mode === 'login' ? '<button class="form-switch" data-action="auth-switch" data-mode="reset">Forgot password?</button>' : ''}</section>`);
  }
  function searchOverlay() {
    openOverlay('search',`<section class="search-panel" role="dialog" aria-modal="true" aria-label="Search the collection"><form class="search-head" data-form="search">${icon('search')}<input id="product-search" name="query" type="search" aria-label="Search products" placeholder="What feels like home?" autocomplete="off"><button type="button" class="icon-btn" data-action="close-overlay" aria-label="Close search">${icon('close')}</button></form><div class="search-content" id="search-results"><span class="eyebrow">A place to begin</span><div class="suggestion-row">${categories.slice(0,6).map(categoryLink).join('')}</div></div></section>`);
    requestAnimationFrame(() => $('#product-search')?.focus());
  }
  function searchResults(query) {
    const list = products.filter(p => `${p.name} ${p.categoryName} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
    $('#search-results').innerHTML = !query.trim() ? `<span class="eyebrow">A place to begin</span><div class="suggestion-row">${categories.slice(0,6).map(categoryLink).join('')}</div>` : `<span class="eyebrow">${list.length} designs found</span>${list.length ? `<div class="product-grid four">${list.slice(0,4).map(card).join('')}</div><div style="margin-top:25px">${textLink(`search/${encodeURIComponent(query)}`,'View all results')}</div>` : '<p>Try “Italian”, “bedroom”, “cabinet” or a different room.</p>'}`;
  }
  function mobileMenu() {
    openOverlay('mobile',`<nav class="mobile-menu" role="dialog" aria-modal="true" aria-label="Explore KLF CASA"><header class="mobile-menu-head"><a href="#/" class="wordmark">KLF CASA</a><button class="icon-btn" data-action="close-overlay" aria-label="Close navigation">${icon('close')}</button></header><div class="mobile-menu-shortcuts">${link('collection/all','All designs')}${link('join','Join Us · Become a partner')}</div><div class="mobile-menu-body">${categories.map(c => `<details><summary>${c.name}</summary>${link(`collection/${c.id}`,'Explore all ' + c.short.toLowerCase() + ' →')}${products.filter(p => p.category === c.id).slice(0,3).map(p => link(`product/${p.id}`,esc(p.name))).join('')}<a href="#/collection/${c.id}">${image(assets[c.image],c.name,'loading="eager"')}</a></details>`).join('')}<div class="mobile-menu-bottom">${link('collection/all','All 67 designs')}${link('journal','The Journal')}${link('about','Our story')}${link('join','Join Us · Become a partner')}${link('contact','Design assistance')}${link('wishlist',`Saved designs (${state.wishlist.length})`)}<button class="btn outline" data-action="account">${state.user ? 'My account & orders' : 'Sign in / create demo profile'}</button></div></div></nav>`);
  }
  function updateCartViews() { persistCart(); if (state.overlay === 'cart') cartDrawer(); else renderCurrentContent(); }
  document.addEventListener('click', event => {
    // 跳到内容只移动键盘焦点，不能把 #main 当作购物页面的路由并重置当前页面。
    if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); main.scrollIntoView({block:'start'}); return; }
    const menu = event.target.closest('[data-menu]');
    if (menu) { state.menu = state.menu === menu.dataset.menu ? null : menu.dataset.menu; renderHeader(); return; }
    const action = event.target.closest('[data-action]');
    const anchor = event.target.closest('a[href^="#/"]');
    if (anchor) { closeOverlay(); state.menu = null; renderHeader(); return; }
    if (!action) { if (state.menu && !event.target.closest('.header')) { state.menu = null; renderHeader(); } return; }
    const {id,index,delta,mode,step} = action.dataset;
    switch (action.dataset.action) {
      case 'mobile-menu': mobileMenu(); break;
      case 'search': searchOverlay(); break;
      // 页内申请入口只滚动并聚焦首字段，保留静态 hash 路由以及手机键盘的可用性。
      case 'join-apply': $('#partner-application')?.scrollIntoView({behavior:'smooth',block:'start'}); $('#partner-application input')?.focus({preventScroll:true}); break;
      case 'cart': cartDrawer(); break;
      case 'close-overlay': closeOverlay(); break;
      case 'shop': closeOverlay(); navigate('collection/all'); break;
      case 'account': closeOverlay(); state.user ? navigate('account') : authModal(); break;
      case 'login': authModal(); break;
      case 'auth-switch': authModal(mode); break;
      case 'logout': state.user = null; storage.write('user',null); render(); toast('You have signed out of the demo.'); break;
      case 'save': {
        if (!getProduct(id)) break;
        state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter(v => v !== id) : [...state.wishlist,id];
        storage.write('wishlist',state.wishlist);
        document.querySelectorAll('[data-action="save"]').forEach(button => { if (button.dataset.id === id) { button.classList.toggle('saved',state.wishlist.includes(id)); button.setAttribute('aria-pressed',String(state.wishlist.includes(id))); button.setAttribute('aria-label',state.wishlist.includes(id) ? 'Remove from saved items' : 'Add to saved items'); } });
        if (currentRoute[0] === 'wishlist') renderCurrentContent();
        toast(state.wishlist.includes(id) ? 'Saved to your considered collection.' : 'Removed from your saved designs.'); break;
      }
      case 'filters': state.filtersVisible = !state.filtersVisible; renderCurrentContent(); break;
      case 'clear-filters': state.priceFilter = []; state.styleFilter = []; state.page = 1; renderCurrentContent(); break;
      case 'page': state.page = Number(action.dataset.page); renderCurrentContent(); $('.collection-toolbar')?.scrollIntoView({block:'start'}); break;
      case 'finish': state.finish = Number(index); renderCurrentContent(); break;
      case 'gallery': state.galleryIndex = Number(index); renderCurrentContent(); break;
      case 'pdp-qty': state.quantity = Math.min(99,Math.max(1,state.quantity + Number(delta))); renderCurrentContent(); break;
      case 'add-cart': {
        if (!getProduct(id)) break;
        const existing = state.cart.find(l => l.id === id && l.finish === state.finish && l.size === state.size);
        if (existing) existing.quantity = Math.min(99,existing.quantity + state.quantity);
        else state.cart.push({id,finish:state.finish,size:state.size,quantity:state.quantity});
        persistCart(); cartDrawer(); break;
      }
      case 'cart-qty': { const line = state.cart[Number(index)]; if (line) line.quantity = Math.min(99,Math.max(1,line.quantity + Number(delta))); updateCartViews(); break; }
      case 'remove-line': state.cart.splice(Number(index),1); updateCartViews(); break;
      case 'checkout-step': state.checkout.step = Number(step); renderCurrentContent(); $('.checkout-steps')?.scrollIntoView(); break;
      case 'lightbox': { const p = getProduct(id); if (p) openOverlay('image',`<div class="lightbox" role="dialog" aria-modal="true" aria-label="${esc(p.name)} photograph">${image(p.images[state.galleryIndex] || p.images[0],p.name)}<button class="icon-btn close" data-action="close-overlay" aria-label="Close photograph">${icon('close')}</button></div>`); break; }
      case 'cancel-order': { const order = state.orders.find(o => o.id === id); if (order && !order.cancelled) { order.cancelled = true; storage.write('orders',state.orders); render(); toast('Demonstration order cancelled.'); } break; }
      case 'clear-data': {
        if (!window.confirm('Clear this demo’s saved bag, designs, profile and example orders from this browser?')) break;
        for (const key of ['cart','wishlist','user','orders','recent']) { try { localStorage.removeItem('klf-demo-' + key); } catch {} }
        state.cart=[];state.wishlist=[];state.user=null;state.orders=[];state.recent=[];state.promo='';render();toast('Local demo data cleared.');break;
      }
    }
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.id === 'sort-products') { state.sort = el.value; state.page=1; renderCurrentContent(); }
    if (el.dataset.filter) { const key = el.dataset.filter; state[key] = el.checked ? [...state[key],el.value] : state[key].filter(v => v !== el.value); state.page=1; renderCurrentContent(); }
    if (el.id === 'product-size') { state.size=el.value; renderCurrentContent(); }
    if (el.name === 'delivery') { state.checkout.delivery=el.value; renderCurrentContent(); }
  });
  document.addEventListener('input', event => { if (event.target.id === 'product-search') searchResults(event.target.value); });
  // error 不冒泡，使用捕获监听动态图片；替代图只尝试一次，防止无效资源反复请求。
  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;
    const fallback = img.dataset.fallback;
    delete img.dataset.fallback;
    if (img.getAttribute('src') !== fallback) {
      img.src = fallback;
      img.alt += ' · similar collection image';
    }
  }, true);
  // 手机菜单一次展开一个分类，减少长页面滚动，加盟快捷入口保持在菜单顶部。
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!details.matches?.('.mobile-menu details') || !details.open) return;
    for (const other of document.querySelectorAll('.mobile-menu details[open]')) if (other !== details) other.open = false;
  }, true);
  document.addEventListener('submit', event => {
    const form = event.target; if (!form.dataset.form) return;
    event.preventDefault(); if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    switch (form.dataset.form) {
      case 'search': closeOverlay(); state.page=1; state.priceFilter=[]; state.styleFilter=[]; navigate('search/' + encodeURIComponent(data.query.trim())); break;
      case 'newsletter': form.innerHTML = `<p role="status" style="color:white">Thank you. Your subscription preview is complete.<br><small>No email was sent or subscription created.</small></p>`; break;
      case 'contact': form.innerHTML = `<div role="status"><span class="eyebrow">A conversation begins</span><h2>Thank you, ${esc(data.name)}.</h2><p>Your enquiry preview is complete. No message has been sent.</p><p>For a real consultation, please contact KLF CASA through the original website.</p><a class="btn" href="https://www.klfcasa.com/contact.html" target="_blank" rel="noopener noreferrer">Visit original contact page ↗</a></div>`; break;
      case 'partnership':
        // 复用静态表单反馈，不存储联系方式，也不把演示提交误报为已收到真实加盟申请。
        form.innerHTML = `<div class="partner-success" role="status" tabindex="-1"><span class="eyebrow">A shared vision starts here</span><h2>Thank you, ${esc(data.name.trim())}.</h2><p>Your partnership enquiry preview is complete.</p><p>You selected <strong>${esc(data.interest)}</strong> in <strong>${esc(data.city.trim())}, ${esc(data.country.trim())}</strong>.</p><p>This was a local demonstration. No application was sent or contact details saved. For a real conversation, please contact the original KLF CASA team.</p><a class="btn" href="https://www.klfcasa.com/contact.html" target="_blank" rel="noopener noreferrer">Contact KLF CASA</a></div>`;
        $('.partner-success',form)?.focus(); break;
      case 'auth': {
        if (state.authMode === 'reset') { authModal('login'); toast('Password-help preview complete. No email was sent.'); break; }
        // 只存演示昵称和邮箱，输入的密码不保存、不传输，避免把静态演示误当真实认证。
        state.user={name:(data.name || data.email.split('@')[0]).trim(),email:data.email.trim().toLowerCase()}; storage.write('user',state.user);
        closeOverlay(); renderHeader(); if (currentRoute[0] === 'checkout') renderCurrentContent(); else navigate('account');
        toast('Welcome to your local demo profile.'); break;
      }
      case 'promo': {
        const code = data.code.trim().toUpperCase();
        if (code === 'CASA10' || code === '') { state.promo=code; renderCurrentContent(); toast(code ? 'CASA10 applied: 10% off demo subtotal.' : 'Promo code removed.'); }
        else toast('That code is not available. Try CASA10.'); break;
      }
      case 'checkout-contact': state.checkout.contact=data; state.checkout.step=2; renderCurrentContent(); $('.checkout-steps')?.scrollIntoView(); break;
      case 'checkout-delivery': state.checkout.delivery=data.delivery; state.checkout.step=3; renderCurrentContent(); $('.checkout-steps')?.scrollIntoView(); break;
      case 'place-order': {
        if (!state.cart.length || !state.checkout.contact.email) break;
        const order={id:'KLF-' + Date.now().toString(36).toUpperCase(),created:Date.now(),contact:{...state.checkout.contact},delivery:state.checkout.delivery,lines:state.cart.map(l => ({...l,unitPrice:itemPrice(l)})),totals:totals(),cancelled:false};
        state.orders.unshift(order); storage.write('orders',state.orders);state.cart=[];state.promo='';persistCart();state.checkout.step=1;navigate('order/' + order.id);break;
      }
    }
  });
  // 键盘可关闭弹层且焦点限制在当前弹层，手机抽屉也复用相同逻辑。
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeOverlay(); state.menu=null; renderHeader(); }
    if (event.key === 'Enter' && event.target.matches('.gallery-main')) event.target.click();
    if (event.key !== 'Tab' || !state.overlay) return;
    const items = [...$('#overlay-root').querySelectorAll('a[href],button:not(:disabled),input,select,textarea,[tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!items.length) return;
    const first=items[0],last=items[items.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault();last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault();first.focus(); }
  });
  document.addEventListener('mouseover', event => {
    const item = event.target.closest('[data-menu]');
    if (item && matchMedia('(hover: hover)').matches) {
      clearTimeout(menuTimer); const menuId=item.dataset.menu;
      if (state.menu !== menuId) menuTimer=setTimeout(() => { state.menu=menuId;renderHeader(); },130);
    } else if (event.target.closest('.header')) clearTimeout(menuTimer);
  });
  document.addEventListener('mouseout', event => {
    if (event.target.closest('.header') && !event.relatedTarget?.closest?.('.header')) { clearTimeout(menuTimer);menuTimer=setTimeout(() => {state.menu=null;renderHeader();},180); }
  });
  window.addEventListener('hashchange', () => {
    state.page=1;state.galleryIndex=0;state.finish=0;state.size='Standard';state.quantity=1;
    state.priceFilter=[];state.styleFilter=[];
    render();window.scrollTo({top:0,behavior:'instant'});
  });
  render();
})();
