export function Loading() {
  return (
    <div className="py-10 text-center text-muted">
      <i className="fa fa-spinner fa-spin text-2xl" aria-hidden="true" />
    </div>
  )
}

export function ErrorBox({ message = 'Nie udało się załadować danych' }: { message?: string }) {
  return <div className="card card-body text-center text-danger">{message}</div>
}
