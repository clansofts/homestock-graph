import {
    Arg,
    Authorized,
    Ctx,
    FieldResolver,
    Mutation,
    Query,
    Resolver,
    Root,
} from 'type-graphql';
import { Inject } from 'typedi';
import { Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { Container } from '../entity/Container';
import { Membership } from '../entity/Membership';
import { Stock } from '../entity/Stock';
import { User } from '../entity/User';
import { ContainerBuilder } from '../service/builders/ContainerBuilder';
import { NewContainer } from './types/Container';

@Resolver(of => Container)
export class ContainerResolver {
    @InjectRepository(Container)
    private readonly containerRepository: Repository<Container>;

    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>;

    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>;

    @Inject()
    private readonly builder: ContainerBuilder;

    @Query(returns => Container, { nullable: true })
    @Authorized()
    async container(@Arg('id') id: string): Promise<Container> {
        return this.containerRepository.findOne({
            id,
        });
    }

    @Query(returns => [Container])
    @Authorized()
    async containers(@Ctx('user') current: User): Promise<Container[]> {
        return this.containerRepository
            .createQueryBuilder('container')
            .innerJoinAndSelect('container.memberships', 'membership')
            .innerJoinAndSelect('membership.user', 'user')
            .where('membership.pending = :pending', { pending: false })
            .andWhere('user.id = :user', {
                user: current.id,
            })
            .getMany();
    }

    @Mutation(returns => Container)
    @Authorized()
    async createContainer(
        @Ctx('user') current: User,
        @Arg('container') newContainer: NewContainer,
    ): Promise<Container> {
        const container = this.builder
            .setName(newContainer.name)
            .setOwner(current)
            .create();

        return this.containerRepository.save(container);
    }

    @FieldResolver(type => [Stock])
    async inventory(@Root() container: Container): Promise<Stock[]> {
        return this.stockRepository.find({ container });
    }

    @FieldResolver(type => [Membership])
    async memberships(@Root() container: Container): Promise<Membership[]> {
        return this.membershipRepository.find({ container });
    }
}
