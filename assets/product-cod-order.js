(() => {
  const primaryError = 'Please complete all required fields.';
  const unavailableError = 'Please choose an available product option.';
  const submitError = 'Could not complete the order. Please try again.';

  const getRootUrl = () => window.Shopify?.routes?.root || '/';
  const getCheckoutUrl = () => `${getRootUrl()}checkout`;

  const postJson = (url, body = {}) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }).then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    });

  const getVariantInput = (section) => {
    const formId = section.dataset.productFormId;
    const form = formId ? document.getElementById(formId) : null;
    return form?.querySelector('[name="id"]');
  };

  const setLoading = (section, isLoading) => {
    const submit = section.querySelector('.product-cod-order__submit');
    const spinner = submit?.querySelector('.loading__spinner');

    submit?.toggleAttribute('disabled', isLoading);
    submit?.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    spinner?.classList.toggle('hidden', !isLoading);
  };

  const setMessage = (section, message = '') => {
    const messageElement = section.querySelector('.product-cod-order__message');
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.toggleAttribute('hidden', message === '');
  };

  const validate = (section, formData) => {
    let isValid = true;

    section.querySelectorAll('[data-error-for]').forEach((error) => {
      const name = error.dataset.errorFor;
      const field = section.querySelector(`[name="${name}"]`);
      const hasValue = field?.value.trim();

      error.classList.toggle('is-visible', !hasValue);
      field?.classList.toggle('is-invalid', !hasValue);

      if (!hasValue) isValid = false;
    });

    if (!isValid) setMessage(section, primaryError);
    return isValid;
  };

  const initCodOrder = (section) => {
    const form = section.querySelector('.product-cod-order__form');
    if (!form || section.dataset.codOrderBound === 'true') return;

    section.dataset.codOrderBound = 'true';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(section);

      const formData = new FormData(form);
      if (!validate(section, formData)) return;

      const variantInput = getVariantInput(section);
      const variantId = Number(variantInput?.value);

      if (!variantId || variantInput?.disabled) {
        setMessage(section, unavailableError);
        return;
      }

      setLoading(section, true);

      const fullName = formData.get('full_name').trim();
      const phone = formData.get('phone').trim();
      const address = formData.get('address').trim();
      const paymentMethod = 'COD';
      const productTitle = section.dataset.productTitle || document.querySelector('.product__title h1')?.textContent?.trim() || '';

      try {
        await postJson(`${getRootUrl()}cart/clear.js`);
        await postJson(window.routes.cart_add_url, {
          items: [
            {
              id: variantId,
              quantity: 1,
            },
          ],
        });
        await postJson(window.routes.cart_update_url, {
          attributes: {
            'COD Full Name': fullName,
            'COD Phone': phone,
            'COD Address': address,
            'Payment Method': paymentMethod,
            'COD Product': productTitle,
          },
          note: `COD order request\nName: ${fullName}\nPhone: ${phone}\nAddress: ${address}`,
        });

        window.location.href = getCheckoutUrl();
      } catch (error) {
        console.error(error);
        setMessage(section, submitError);
        setLoading(section, false);
      }
    });

    form.addEventListener('input', (event) => {
      const field = event.target.closest('[name]');
      if (!field) return;

      const error = section.querySelector(`[data-error-for="${field.name}"]`);
      if (!error) return;

      const hasValue = field.value.trim();
      error.classList.toggle('is-visible', !hasValue);
      field.classList.toggle('is-invalid', !hasValue);
      if (hasValue) setMessage(section);
    });
  };

  const initScrollButtons = (root = document) => {
    root.querySelectorAll('[data-cod-scroll-target]:not([data-cod-scroll-bound])').forEach((button) => {
      button.dataset.codScrollBound = 'true';

      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.codScrollTarget);
        if (!target) return;

        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.querySelector('input, textarea')?.focus({ preventScroll: true });
      });
    });
  };

  const init = (root = document) => {
    root.querySelectorAll('.product-cod-order').forEach(initCodOrder);
    initScrollButtons(root);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
