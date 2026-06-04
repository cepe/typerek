FROM ruby:3.3.6 AS builder

ARG RAILS_ENV="production"
ENV RAILS_ENV=${RAILS_ENV}

WORKDIR /app

RUN apt-get -q update \
    && apt-get -y install build-essential nodejs \
    && curl -sSL https://deb.nodesource.com/setup_18.x | bash - \
    && curl -sSL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo 'deb https://dl.yarnpkg.com/debian/ stable main' | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs yarn \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc /usr/share/man \
    && apt-get clean \
    && gem install bundle

COPY Gemfile* ./
RUN bundle install --jobs "$(nproc)" --retry 5

COPY . .

CMD ["bash"]

# ── Build the React SPA; Rails serves it from public/ (same origin, no CORS) ─────
FROM node:20-slim AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM ruby:3.3.6 AS app

WORKDIR /app

ARG RAILS_ENV="production"
ARG UID=1000
ARG GID=1000

RUN apt-get -q update && \
    apt-get -y install build-essential nodejs && \
    gem install bundler && \
    apt-get clean && \
    groupadd -g ${GID} ruby && \
    useradd --create-home --no-log-init -u ${UID} -g ${GID} ruby && \
    chown ruby:ruby -R /app

USER ruby

COPY --chown=ruby:ruby --from=builder /usr/local/bundle /usr/local/bundle
COPY --chown=ruby:ruby --from=builder /app/public public
COPY --chown=ruby:ruby . .

# Overlay the built SPA into public/ (index.html + hashed assets + team flags),
# served statically by Rails alongside the /api/v1 JSON API.
COPY --chown=ruby:ruby --from=frontend /frontend/dist/. public/

EXPOSE 8000
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
