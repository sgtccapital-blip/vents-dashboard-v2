const toggle = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

/** Chips para asignar un elemento de la biblioteca (línea, hook, referencia) a cuentas. */
export default function AccountChips({ accounts, value = [], onChange }) {
    return (
        <div className="lib-chips">
            {accounts.map(a => (
                <button key={a.id} type="button" className={`raw-chip ${value.includes(a.id) ? 'on' : ''}`} onClick={() => onChange(toggle(value, a.id))}>{a.handler}</button>
            ))}
        </div>
    );
}
